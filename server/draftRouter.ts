import { z } from "zod";
import { eq, and, notInArray, inArray, sql } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { 
  manufacturers, 
  cannabisStrains, 
  strains, 
  pharmacies, 
  brands, 
  rosters, 
  leagues, 
  teams, 
  draftPicks,
  manufacturerWeeklyStats,
  cannabisStrainWeeklyStats,
  strainWeeklyStats,
  pharmacyWeeklyStats,
  brandWeeklyStats,
} from "../drizzle/schema";
import {
  manufacturerDailyChallengeStats,
  strainDailyChallengeStats,
  productDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats,
} from "../drizzle/dailyChallengeSchema";
import { wsManager } from "./websocket";
import { validateDraftPick, advanceDraftPick, calculateNextPick, getDraftStatus, checkAndCompleteDraft } from "./draftLogic";
import { draftTimerManager } from "./draftTimer";

/**
 * Helper function to parse JSON or comma-separated string into array
 */
function parseJsonOrArray(value: string | null | undefined): string[] {
  if (!value) return [];
  
  // If it's already an array (shouldn't happen but safe check)
  if (Array.isArray(value)) return value;
  
  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    // If it's a single value, wrap it in array
    return [String(parsed)];
  } catch {
    // If JSON parse fails, try comma-separated
    if (typeof value === 'string' && value.includes(',')) {
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    // Single value
    return value ? [value] : [];
  }
}

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function getDailyChallengeStatDates() {
  const today = new Date();
  const todayStatDate = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStatDate = yesterday.toISOString().split("T")[0];
  return { todayStatDate, yesterdayStatDate };
}

async function getDailyChallengePoints(
  db: Database,
  {
    ids,
    table,
    idColumn,
    todayStatDate,
    yesterdayStatDate,
  }: {
    ids: number[];
    table: any;
    idColumn: any;
    todayStatDate: string;
    yesterdayStatDate: string;
  }
) {
  if (ids.length === 0) {
    return {
      todayMap: new Map<number, number | null>(),
      yesterdayMap: new Map<number, number | null>(),
    };
  }

  const fetchForDate = (statDate: string) =>
    db
      .select({
        assetId: idColumn,
        totalPoints: table.totalPoints,
      })
      .from(table)
      .where(
        and(
          inArray(idColumn, ids),
          eq(table.statDate, statDate)
        )
      );

  const [todayRows, yesterdayRows] = await Promise.all([
    fetchForDate(todayStatDate),
    fetchForDate(yesterdayStatDate),
  ]);

  const todayMap = new Map<number, number | null>(
    todayRows.map((row) => [row.assetId, row.totalPoints])
  );
  const yesterdayMap = new Map<number, number | null>(
    yesterdayRows.map((row) => [row.assetId, row.totalPoints])
  );

  return { todayMap, yesterdayMap };
}

/**
 * Draft Router
 * 
 * Handles draft operations:
 * - Get available players by category
 * - Make draft pick
 * - Get draft status
 */
export const draftRouter = router({
  /**
   * Get available manufacturers for drafting
   */
  getAvailableManufacturers: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        search: z.string().optional(),
        limit: z.number().default(200),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all team IDs in the league
      const leagueTeams = await db
        .select({ teamId: teams.id })
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));

      const teamIds = leagueTeams.map((t) => t.teamId);

      // Get already drafted manufacturers
      const draftedManufacturers = teamIds.length > 0
        ? await db
            .select({ assetId: rosters.assetId })
            .from(rosters)
            .where(
              and(
                inArray(rosters.teamId, teamIds),
                eq(rosters.assetType, "manufacturer")
              )
            )
        : [];

      const draftedIds = draftedManufacturers.map((r) => r.assetId);
      
      console.log('[getAvailableManufacturers] Drafted IDs:', draftedIds);
      console.log('[getAvailableManufacturers] Team IDs in league:', teamIds);

      // Get available manufacturers
      // Build where conditions
      const conditions = [];
      
      if (draftedIds.length > 0) {
        conditions.push(notInArray(manufacturers.id, draftedIds));
      }
      
      if (input.search) {
        conditions.push(sql`${manufacturers.name} ILIKE ${`%${input.search}%`}`);
      }
      
      let query = db.select().from(manufacturers);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const available = await query.limit(input.limit);
      const { todayStatDate, yesterdayStatDate } = getDailyChallengeStatDates();
      const manufacturerIds = available.map((mfg) => mfg.id);
      const { todayMap, yesterdayMap } = await getDailyChallengePoints(db, {
        ids: manufacturerIds,
        table: manufacturerDailyChallengeStats,
        idColumn: manufacturerDailyChallengeStats.manufacturerId,
        todayStatDate,
        yesterdayStatDate,
      });

      return available.map((mfg) => ({
        id: mfg.id,
        name: mfg.name,
        productCount: mfg.productCount || 0,
        todayPoints: todayMap.get(mfg.id) ?? null,
        yesterdayPoints: yesterdayMap.get(mfg.id) ?? null,
        todayStatDate,
        yesterdayStatDate,
        // TODO: Add more stats
      }));
    }),

  /**
   * Get available cannabis strains for drafting
   */
  getAvailableCannabisStrains: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        search: z.string().optional(),
        limit: z.number().default(200),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all team IDs in the league
      const leagueTeams = await db
        .select({ teamId: teams.id })
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));

      const teamIds = leagueTeams.map((t) => t.teamId);

      // Get already drafted cannabis strains
      const draftedStrains = teamIds.length > 0
        ? await db
            .select({ assetId: rosters.assetId })
            .from(rosters)
            .where(
              and(
                inArray(rosters.teamId, teamIds),
                eq(rosters.assetType, "cannabis_strain")
              )
            )
        : [];

      const draftedIds = draftedStrains.map((r) => r.assetId);

      // Get available cannabis strains
      // Build where conditions
      const conditions = [];
      
      if (draftedIds.length > 0) {
        conditions.push(notInArray(cannabisStrains.id, draftedIds));
      }
      
      if (input.search) {
        conditions.push(sql`${cannabisStrains.name} ILIKE ${`%${input.search}%`}`);
      }
      
      let query = db.select().from(cannabisStrains);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const available = await query.limit(input.limit);
      const { todayStatDate, yesterdayStatDate } = getDailyChallengeStatDates();
      const strainIds = available.map((strain) => strain.id);
      const { todayMap, yesterdayMap } = await getDailyChallengePoints(db, {
        ids: strainIds,
        table: strainDailyChallengeStats,
        idColumn: strainDailyChallengeStats.strainId,
        todayStatDate,
        yesterdayStatDate,
      });

      const result = available.map((strain) => ({
        id: strain.id,
        name: strain.name,
        type: strain.type || "Unknown",
        effects: parseJsonOrArray(strain.effects),
        flavors: parseJsonOrArray(strain.flavors),
        todayPoints: todayMap.get(strain.id) ?? null,
        yesterdayPoints: yesterdayMap.get(strain.id) ?? null,
        todayStatDate,
        yesterdayStatDate,
        // TODO: Add more stats
      }));
      
      console.log('[getAvailableCannabisStrains] Sample data:', result.slice(0, 3).map(s => ({
        name: s.name,
        yesterdayPoints: s.yesterdayPoints,
        todayPoints: s.todayPoints
      })));
      
      return result;
    }),

  /**
   * Get available products for drafting
   */
  getAvailableProducts: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        search: z.string().optional(),
        limit: z.number().default(200),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all team IDs in the league
      const leagueTeams = await db
        .select({ teamId: teams.id })
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));

      const teamIds = leagueTeams.map((t) => t.teamId);

      // Get already drafted products
      const draftedProducts = teamIds.length > 0
        ? await db
            .select({ assetId: rosters.assetId })
            .from(rosters)
            .where(
              and(
                inArray(rosters.teamId, teamIds),
                eq(rosters.assetType, "product")
              )
            )
        : [];

      const draftedIds = draftedProducts.map((r) => r.assetId);
      
      console.log('[getAvailableProducts] Drafted IDs:', draftedIds);
      console.log('[getAvailableProducts] Drafted IDs types:', draftedIds.map(id => typeof id));
      console.log('[getAvailableProducts] Team IDs in league:', teamIds);

      // Get available products
      // Build where conditions
      const conditions = [];
      
      if (draftedIds.length > 0) {
        conditions.push(notInArray(strains.id, draftedIds));
      }
      
      if (input.search) {
        conditions.push(sql`${strains.name} ILIKE ${`%${input.search}%`}`);
      }
      
      let query = db.select().from(strains);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const available = await query.limit(input.limit);
      const { todayStatDate, yesterdayStatDate } = getDailyChallengeStatDates();
      const productIds = available.map((product) => product.id);
      const { todayMap, yesterdayMap } = await getDailyChallengePoints(db, {
        ids: productIds,
        table: productDailyChallengeStats,
        idColumn: productDailyChallengeStats.productId,
        todayStatDate,
        yesterdayStatDate,
      });

      const result = available.map((product) => ({
        id: product.id,
        name: product.name,
        manufacturer: product.manufacturerName || "Unknown",
        thcContent: product.thcContent || 0,
        cbdContent: product.cbdContent || 0,
        favoriteCount: product.favoriteCount || 0,
        todayPoints: todayMap.get(product.id) ?? null,
        yesterdayPoints: yesterdayMap.get(product.id) ?? null,
        todayStatDate,
        yesterdayStatDate,
        // TODO: Add more stats
      }));
      
      console.log('[getAvailableProducts] Sample data:', result.slice(0, 3).map(p => ({
        name: p.name,
        yesterdayPoints: p.yesterdayPoints,
        todayPoints: p.todayPoints,
      })));
      
      // Check if Demecan Typ 1 is in results
      const demecan = result.find(p => p.name === 'Demecan Typ 1');
      if (demecan) {
        console.log('[getAvailableProducts] ⚠️  Demecan Typ 1 FOUND in results (ID:', demecan.id, ')');
      } else {
        console.log('[getAvailableProducts] ✅ Demecan Typ 1 NOT in results (correctly filtered)');
      }
      
      return result;
    }),

  /**
   * Get available pharmacies for drafting
   */
  getAvailablePharmacies: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        search: z.string().optional(),
        limit: z.number().default(200),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all team IDs in the league
      const leagueTeams = await db
        .select({ teamId: teams.id })
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));

      const teamIds = leagueTeams.map((t) => t.teamId);

      // Get already drafted pharmacies
      const draftedPharmacies = teamIds.length > 0
        ? await db
            .select({ assetId: rosters.assetId })
            .from(rosters)
            .where(
              and(
                inArray(rosters.teamId, teamIds),
                eq(rosters.assetType, "pharmacy")
              )
            )
        : [];

      const draftedIds = draftedPharmacies.map((r) => r.assetId);

      // Get available pharmacies
      // Build where conditions
      const conditions = [];
      
      if (draftedIds.length > 0) {
        conditions.push(notInArray(pharmacies.id, draftedIds));
      }
      
      if (input.search) {
        conditions.push(sql`${pharmacies.name} ILIKE ${`%${input.search}%`}`);
      }
      
      let query = db.select().from(pharmacies);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const available = await query.limit(input.limit);
      const { todayStatDate, yesterdayStatDate } = getDailyChallengeStatDates();
      const pharmacyIds = available.map((phm) => phm.id);
      const { todayMap, yesterdayMap } = await getDailyChallengePoints(db, {
        ids: pharmacyIds,
        table: pharmacyDailyChallengeStats,
        idColumn: pharmacyDailyChallengeStats.pharmacyId,
        todayStatDate,
        yesterdayStatDate,
      });

      return available.map((phm) => ({
        id: phm.id,
        name: phm.name,
        city: phm.city || "Unknown",
        todayPoints: todayMap.get(phm.id) ?? null,
        yesterdayPoints: yesterdayMap.get(phm.id) ?? null,
        todayStatDate,
        yesterdayStatDate,
        // TODO: Add more stats
      }));
    }),

  /**
   * Get available brands for drafting
   */
  getAvailableBrands: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        search: z.string().optional(),
        limit: z.number().default(200),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all team IDs in the league
      const leagueTeams = await db
        .select({ teamId: teams.id })
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));

      const teamIds = leagueTeams.map((t) => t.teamId);

      // Get already drafted brands
      const draftedBrands = teamIds.length > 0
        ? await db
            .select({ assetId: rosters.assetId })
            .from(rosters)
            .where(
              and(
                inArray(rosters.teamId, teamIds),
                eq(rosters.assetType, "brand")
              )
            )
        : [];

      const draftedIds = draftedBrands.map((r) => r.assetId);

      // Get available brands
      // Build where conditions
      const conditions = [];
      
      if (draftedIds.length > 0) {
        conditions.push(notInArray(brands.id, draftedIds));
      }
      
      if (input.search) {
        conditions.push(sql`${brands.name} ILIKE ${`%${input.search}%`}`);
      }
      
      let query = db.select().from(brands);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const available = await query.limit(input.limit);
      const { todayStatDate, yesterdayStatDate } = getDailyChallengeStatDates();
      const brandIds = available.map((brand) => brand.id);
      const { todayMap, yesterdayMap } = await getDailyChallengePoints(db, {
        ids: brandIds,
        table: brandDailyChallengeStats,
        idColumn: brandDailyChallengeStats.brandId,
        todayStatDate,
        yesterdayStatDate,
      });

      return available.map((brand) => ({
        id: brand.id,
        name: brand.name,
        totalFavorites: brand.totalFavorites || 0,
        totalViews: brand.totalViews || 0,
        todayPoints: todayMap.get(brand.id) ?? null,
        yesterdayPoints: yesterdayMap.get(brand.id) ?? null,
        todayStatDate,
        yesterdayStatDate,
        // TODO: Add more stats
      }));
    }),

  /**
   * Make a draft pick
   */
  makeDraftPick: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        teamId: z.number(),
        assetType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
        assetId: z.number(),
        draftRound: z.number().optional(),
        draftPick: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if draft should be complete (handles stuck drafts)
      const wasCompleted = await checkAndCompleteDraft(input.leagueId);
      if (wasCompleted) {
        // Draft just completed, notify clients
        wsManager.notifyDraftComplete(input.leagueId);
        throw new Error("Draft is complete");
      }

      // Validate the draft pick
      const validation = await validateDraftPick(
        input.leagueId,
        input.teamId,
        input.assetType,
        input.assetId
      );

      if (!validation.valid) {
        // Check again if draft should be complete before throwing error
        const nowCompleted = await checkAndCompleteDraft(input.leagueId);
        if (nowCompleted) {
          wsManager.notifyDraftComplete(input.leagueId);
          throw new Error("Draft is complete");
        }
        throw new Error(validation.error || "Invalid draft pick");
      }

      // Calculate draft round and pick if not provided
      const currentRosterSize = await db
        .select()
        .from(rosters)
        .where(eq(rosters.teamId, input.teamId));
      
      const draftRound = input.draftRound || Math.floor(currentRosterSize.length / 9) + 1;
      const draftPick = input.draftPick || currentRosterSize.length + 1;

      // Get team and asset details for WebSocket notification
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, input.teamId))
        .limit(1);

      let assetName = "Unknown";
      if (input.assetType === "manufacturer") {
        const [mfg] = await db.select().from(manufacturers).where(eq(manufacturers.id, input.assetId)).limit(1);
        assetName = mfg?.name || "Unknown";
      } else if (input.assetType === "cannabis_strain") {
        const [strain] = await db.select().from(cannabisStrains).where(eq(cannabisStrains.id, input.assetId)).limit(1);
        assetName = strain?.name || "Unknown";
      } else if (input.assetType === "product") {
        const [product] = await db.select().from(strains).where(eq(strains.id, input.assetId)).limit(1);
        assetName = product?.name || "Unknown";
      } else if (input.assetType === "pharmacy") {
        const [pharmacy] = await db.select().from(pharmacies).where(eq(pharmacies.id, input.assetId)).limit(1);
        assetName = pharmacy?.name || "Unknown";
      }

      // Add to roster
      await db.insert(rosters).values({
        teamId: input.teamId,
        assetType: input.assetType,
        assetId: input.assetId,
        acquiredWeek: 0, // Draft is week 0
        acquiredVia: "draft",
      });

      // Notify all clients in the draft room
      wsManager.notifyPlayerPicked(input.leagueId, {
        teamId: input.teamId,
        teamName: team?.name || "Unknown Team",
        assetType: input.assetType,
        assetId: input.assetId,
        assetName,
        pickNumber: draftPick,
      });

      // Record draft pick in draftPicks table
      const draftStatus = await getDraftStatus(input.leagueId);
      await db.insert(draftPicks).values({
        leagueId: input.leagueId,
        teamId: input.teamId,
        round: draftStatus.currentRound,
        pickNumber: draftStatus.currentPick,
        assetType: input.assetType,
        assetId: input.assetId,
      });

      // Advance to next pick
      await advanceDraftPick(input.leagueId);

      // Stop current timer
      draftTimerManager.stopTimer(input.leagueId);

      // Check if draft is now complete
      const isDraftComplete = await checkAndCompleteDraft(input.leagueId);

      if (isDraftComplete) {
        // Stop timer
        draftTimerManager.stopTimer(input.leagueId);

        // Notify all clients
        wsManager.notifyDraftComplete(input.leagueId);

        console.log(`[DraftRouter] Draft complete for league ${input.leagueId}`);
      } else {
        // Calculate and notify next pick
        const nextPickInfo = await calculateNextPick(input.leagueId).catch(() => null);
        if (nextPickInfo) {
          wsManager.notifyNextPick(input.leagueId, {
            teamId: nextPickInfo.teamId,
            teamName: nextPickInfo.teamName,
            pickNumber: nextPickInfo.pickNumber,
            round: nextPickInfo.round,
          });

          // Start timer for next pick
          await draftTimerManager.startTimer(input.leagueId);
        }
      }

      return { success: true, assetName };
    }),

  /**
   * Start the draft (Commissioner only)
   */
  startDraft: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get league
      const [league] = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (!league) {
        throw new Error("League not found");
      }

      // Verify user is commissioner
      if (league.commissionerUserId !== ctx.user.id) {
        throw new Error("Only the commissioner can start the draft");
      }

      // Check if draft already started
      if (league.draftStarted) {
        throw new Error("Draft has already started");
      }

      // Get all teams in league
      const leagueTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));

      if (leagueTeams.length < 2) {
        throw new Error("Need at least 2 teams to start draft");
      }

      // Update league status
      await db
        .update(leagues)
        .set({
          draftStarted: 1,
          currentDraftPick: 1,
          currentDraftRound: 1,
          // Status remains "draft" during drafting
        })
        .where(eq(leagues.id, input.leagueId));

      // Notify all clients
      wsManager.broadcastToDraftRoom(input.leagueId, {
        type: "draft_started",
        timestamp: Date.now(),
      });

      // Start timer for first pick
      await draftTimerManager.startTimer(input.leagueId);

      // Calculate and notify first pick
      const firstPick = await calculateNextPick(input.leagueId);
      wsManager.notifyNextPick(input.leagueId, {
        teamId: firstPick.teamId,
        teamName: firstPick.teamName,
        pickNumber: firstPick.pickNumber,
        round: firstPick.round,
      });

      return { success: true, teamCount: leagueTeams.length };
    }),

  /**
   * Get current draft status
   */
  getDraftStatus: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const status = await getDraftStatus(input.leagueId);
      const nextPick = await calculateNextPick(input.leagueId).catch(() => null);

      return {
        ...status,
        nextPick,
      };
    }),

  /**
   * Force check and complete draft if it should be done
   * Useful for fixing stuck drafts
   */
  checkDraftCompletion: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .mutation(async ({ input }) => {
      const wasCompleted = await checkAndCompleteDraft(input.leagueId);
      
      if (wasCompleted) {
        // Notify all clients
        wsManager.notifyDraftComplete(input.leagueId);
        
        return {
          success: true,
          message: "Draft has been marked as complete",
          completed: true,
        };
      }

      return {
        success: true,
        message: "Draft is not yet complete",
        completed: false,
      };
    }),

  /**
   * Get all draft picks with scoring data for live draft board
   */
  getAllDraftPicks: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch all draft picks for this league
      const picks = await db
        .select()
        .from(draftPicks)
        .where(eq(draftPicks.leagueId, input.leagueId))
        .orderBy(draftPicks.pickNumber);

      // Get team names
      const teamMap = new Map<number, string>();
      const leagueTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));
      leagueTeams.forEach(t => teamMap.set(t.id, t.name));

      // Process each pick to get asset name and stats
      const enrichedPicks = await Promise.all(picks.map(async (pick) => {
        let assetName = "Unknown";
        let lastWeekPoints: number | null = null;
        let trendPercent: number | null = null;

        // Fetch asset name and stats based on type
        if (pick.assetType === 'manufacturer') {
          const [asset] = await db.select().from(manufacturers).where(eq(manufacturers.id, pick.assetId)).limit(1);
          assetName = asset?.name || "Unknown";

          // Fetch last week stats
          const [lastWeekStat] = await db
            .select()
            .from(manufacturerWeeklyStats)
            .where(and(
              eq(manufacturerWeeklyStats.manufacturerId, pick.assetId),
              eq(manufacturerWeeklyStats.year, input.year),
              eq(manufacturerWeeklyStats.week, input.week - 1)
            ))
            .limit(1);
          
          if (lastWeekStat) {
            lastWeekPoints = lastWeekStat.totalPoints;

            // Get week-2 for trend
            const [twoWeeksAgo] = await db
              .select()
              .from(manufacturerWeeklyStats)
              .where(and(
                eq(manufacturerWeeklyStats.manufacturerId, pick.assetId),
                eq(manufacturerWeeklyStats.year, input.year),
                eq(manufacturerWeeklyStats.week, input.week - 2)
              ))
              .limit(1);

            if (twoWeeksAgo && twoWeeksAgo.totalPoints > 0) {
              trendPercent = ((lastWeekStat.totalPoints - twoWeeksAgo.totalPoints) / twoWeeksAgo.totalPoints) * 100;
            }
          }
        } else if (pick.assetType === 'cannabis_strain') {
          const [asset] = await db.select().from(cannabisStrains).where(eq(cannabisStrains.id, pick.assetId)).limit(1);
          assetName = asset?.name || "Unknown";

          const [lastWeekStat] = await db
            .select()
            .from(cannabisStrainWeeklyStats)
            .where(and(
              eq(cannabisStrainWeeklyStats.cannabisStrainId, pick.assetId),
              eq(cannabisStrainWeeklyStats.year, input.year),
              eq(cannabisStrainWeeklyStats.week, input.week - 1)
            ))
            .limit(1);

          if (lastWeekStat) {
            lastWeekPoints = lastWeekStat.totalPoints;

            const [twoWeeksAgo] = await db
              .select()
              .from(cannabisStrainWeeklyStats)
              .where(and(
                eq(cannabisStrainWeeklyStats.cannabisStrainId, pick.assetId),
                eq(cannabisStrainWeeklyStats.year, input.year),
                eq(cannabisStrainWeeklyStats.week, input.week - 2)
              ))
              .limit(1);

            if (twoWeeksAgo && twoWeeksAgo.totalPoints > 0) {
              trendPercent = ((lastWeekStat.totalPoints - twoWeeksAgo.totalPoints) / twoWeeksAgo.totalPoints) * 100;
            }
          }
        } else if (pick.assetType === 'product') {
          const [asset] = await db.select().from(strains).where(eq(strains.id, pick.assetId)).limit(1);
          assetName = asset?.name || "Unknown";

          const [lastWeekStat] = await db
            .select()
            .from(strainWeeklyStats)
            .where(and(
              eq(strainWeeklyStats.strainId, pick.assetId),
              eq(strainWeeklyStats.year, input.year),
              eq(strainWeeklyStats.week, input.week - 1)
            ))
            .limit(1);

          if (lastWeekStat) {
            lastWeekPoints = lastWeekStat.totalPoints;

            const [twoWeeksAgo] = await db
              .select()
              .from(strainWeeklyStats)
              .where(and(
                eq(strainWeeklyStats.strainId, pick.assetId),
                eq(strainWeeklyStats.year, input.year),
                eq(strainWeeklyStats.week, input.week - 2)
              ))
              .limit(1);

            if (twoWeeksAgo && twoWeeksAgo.totalPoints > 0) {
              trendPercent = ((lastWeekStat.totalPoints - twoWeeksAgo.totalPoints) / twoWeeksAgo.totalPoints) * 100;
            }
          }
        } else if (pick.assetType === 'pharmacy') {
          const [asset] = await db.select().from(pharmacies).where(eq(pharmacies.id, pick.assetId)).limit(1);
          assetName = asset?.name || "Unknown";

          const [lastWeekStat] = await db
            .select()
            .from(pharmacyWeeklyStats)
            .where(and(
              eq(pharmacyWeeklyStats.pharmacyId, pick.assetId),
              eq(pharmacyWeeklyStats.year, input.year),
              eq(pharmacyWeeklyStats.week, input.week - 1)
            ))
            .limit(1);

          if (lastWeekStat) {
            lastWeekPoints = lastWeekStat.totalPoints;

            const [twoWeeksAgo] = await db
              .select()
              .from(pharmacyWeeklyStats)
              .where(and(
                eq(pharmacyWeeklyStats.pharmacyId, pick.assetId),
                eq(pharmacyWeeklyStats.year, input.year),
                eq(pharmacyWeeklyStats.week, input.week - 2)
              ))
              .limit(1);

            if (twoWeeksAgo && twoWeeksAgo.totalPoints > 0) {
              trendPercent = ((lastWeekStat.totalPoints - twoWeeksAgo.totalPoints) / twoWeeksAgo.totalPoints) * 100;
            }
          }
        } else if (pick.assetType === 'brand') {
          const [asset] = await db.select().from(brands).where(eq(brands.id, pick.assetId)).limit(1);
          assetName = asset?.name || "Unknown";

          const [lastWeekStat] = await db
            .select()
            .from(brandWeeklyStats)
            .where(and(
              eq(brandWeeklyStats.brandId, pick.assetId),
              eq(brandWeeklyStats.year, input.year),
              eq(brandWeeklyStats.week, input.week - 1)
            ))
            .limit(1);

          if (lastWeekStat) {
            lastWeekPoints = lastWeekStat.totalPoints;

            const [twoWeeksAgo] = await db
              .select()
              .from(brandWeeklyStats)
              .where(and(
                eq(brandWeeklyStats.brandId, pick.assetId),
                eq(brandWeeklyStats.year, input.year),
                eq(brandWeeklyStats.week, input.week - 2)
              ))
              .limit(1);

            if (twoWeeksAgo && twoWeeksAgo.totalPoints > 0) {
              trendPercent = ((lastWeekStat.totalPoints - twoWeeksAgo.totalPoints) / twoWeeksAgo.totalPoints) * 100;
            }
          }
        }

        return {
          pickNumber: pick.pickNumber,
          round: pick.round,
          teamId: pick.teamId,
          teamName: teamMap.get(pick.teamId) || "Unknown Team",
          assetType: pick.assetType,
          assetId: pick.assetId,
          assetName,
          lastWeekPoints,
          trendPercent,
          pickTime: pick.pickTime,
        };
      }));

      return enrichedPicks;
    }),
});
