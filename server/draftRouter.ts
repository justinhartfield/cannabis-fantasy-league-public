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
  users,
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

const DRAFT_TIMING_ENABLED = process.env.DRAFT_TIMING_LOGS === "1";

function logDraftTiming(step: string, data?: Record<string, unknown>) {
  if (!DRAFT_TIMING_ENABLED) return;
  if (data) {
    console.log(`[DraftTiming] ${step}`, data);
  } else {
    console.log(`[DraftTiming] ${step}`);
  }
}

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
type DraftPickRow = typeof draftPicks.$inferSelect;

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

      // Get available manufacturers
      // Build where conditions
      const conditions = [];
      
      // Only include manufacturers with pharma products (exclude accessory brands)
      conditions.push(sql`${manufacturers.productCount} > 0`);
      
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

      const result = available.map((mfg) => ({
        id: mfg.id,
        name: mfg.name,
        productCount: mfg.productCount || 0,
        logoUrl: mfg.logoUrl,
        todayPoints: todayMap.get(mfg.id) ?? null,
        yesterdayPoints: yesterdayMap.get(mfg.id) ?? null,
        todayStatDate,
        yesterdayStatDate,
      }));
      
      return result;
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
        imageUrl: strain.imageUrl,
        todayPoints: todayMap.get(strain.id) ?? null,
        yesterdayPoints: yesterdayMap.get(strain.id) ?? null,
        todayStatDate,
        yesterdayStatDate,
        // TODO: Add more stats
      }));
      
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
        imageUrl: product.imageUrl,
        todayPoints: todayMap.get(product.id) ?? null,
        yesterdayPoints: yesterdayMap.get(product.id) ?? null,
        todayStatDate,
        yesterdayStatDate,
        // TODO: Add more stats
      }));
      
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
        logoUrl: phm.logoUrl,
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
        logoUrl: brand.logoUrl,
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

      const timingStart = Date.now();
      logDraftTiming("makeDraftPick:start", {
        leagueId: input.leagueId,
        teamId: input.teamId,
        assetType: input.assetType,
        assetId: input.assetId,
      });

      // Load league to ensure draft has not already completed and to get current pick/round
      const [league] = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (!league) {
        throw new Error("League not found");
      }

      if (league.draftCompleted === 1) {
        logDraftTiming("makeDraftPick:league_already_complete", {
          leagueId: input.leagueId,
        });
        throw new Error("Draft is complete");
      }

      const currentPickNumber = league.currentDraftPick;
      const currentRound = league.currentDraftRound;

      // ========== PARALLEL PHASE 1: Validation + Roster Count + Team Lookup ==========
      const parallelStart = Date.now();
      const [validation, currentRosterSize, teamResult] = await Promise.all([
        validateDraftPick(input.leagueId, input.teamId, input.assetType, input.assetId),
        db.select().from(rosters).where(eq(rosters.teamId, input.teamId)),
        db.select().from(teams).where(eq(teams.id, input.teamId)).limit(1),
      ]);
      logDraftTiming("makeDraftPick:parallelPhase1", {
        leagueId: input.leagueId,
        durationMs: Date.now() - parallelStart,
        valid: validation.valid,
      });

      if (!validation.valid) {
        throw new Error(validation.error || "Invalid draft pick");
      }

      const team = teamResult[0];
      const draftRound = input.draftRound || Math.floor(currentRosterSize.length / 9) + 1;
      const draftPick = input.draftPick || currentRosterSize.length + 1;

      // ========== PARALLEL PHASE 2: Asset Lookup + DB Writes ==========
      // Asset lookup runs in parallel with roster/draftPicks inserts
      const writeStart = Date.now();
      
      // Get asset name based on type (single query)
      const assetLookupPromise = (async () => {
        if (input.assetType === "manufacturer") {
          const [mfg] = await db.select().from(manufacturers).where(eq(manufacturers.id, input.assetId)).limit(1);
          return { name: mfg?.name || "Unknown", imageUrl: mfg?.logoUrl || null };
        } else if (input.assetType === "cannabis_strain") {
          const [strain] = await db.select().from(cannabisStrains).where(eq(cannabisStrains.id, input.assetId)).limit(1);
          return { name: strain?.name || "Unknown", imageUrl: strain?.imageUrl || null };
        } else if (input.assetType === "product") {
          const [product] = await db.select().from(strains).where(eq(strains.id, input.assetId)).limit(1);
          return { name: product?.name || "Unknown", imageUrl: product?.imageUrl || null };
        } else if (input.assetType === "pharmacy") {
          const [pharmacy] = await db.select().from(pharmacies).where(eq(pharmacies.id, input.assetId)).limit(1);
          return { name: pharmacy?.name || "Unknown", imageUrl: pharmacy?.logoUrl || null };
        } else if (input.assetType === "brand") {
          const [brand] = await db.select().from(brands).where(eq(brands.id, input.assetId)).limit(1);
          return { name: brand?.name || "Unknown", imageUrl: brand?.logoUrl || null };
        }
        return { name: "Unknown", imageUrl: null };
      })();

      // Run asset lookup, roster insert, and draft pick insert in parallel
      const [assetInfo] = await Promise.all([
        assetLookupPromise,
        db.insert(rosters).values({
          teamId: input.teamId,
          assetType: input.assetType,
          assetId: input.assetId,
          acquiredWeek: 0,
          acquiredVia: "draft",
        }),
        db.insert(draftPicks).values({
          leagueId: input.leagueId,
          teamId: input.teamId,
          round: currentRound,
          pickNumber: currentPickNumber,
          assetType: input.assetType,
          assetId: input.assetId,
        }),
      ]);

      const assetName = assetInfo.name;
      const assetImageUrl = assetInfo.imageUrl;

      logDraftTiming("makeDraftPick:parallelPhase2", {
        leagueId: input.leagueId,
        durationMs: Date.now() - writeStart,
      });

      // Notify all clients in the draft room about the pick itself
      wsManager.notifyPlayerPicked(input.leagueId, {
        teamId: input.teamId,
        teamName: team?.name || "Unknown Team",
        assetType: input.assetType,
        assetId: input.assetId,
        assetName,
        pickNumber: draftPick,
        imageUrl: assetImageUrl,
      });

      // Remove the drafted player from all wishlists in the league (graceful - doesn't break if table doesn't exist)
      try {
        const { removeFromAllWishlists } = await import("./autoPick");
        await removeFromAllWishlists(input.leagueId, input.assetType, input.assetId);

        // Notify clients about wishlist update
        wsManager.notifyWishlistPlayerDrafted(input.leagueId, {
          assetType: input.assetType,
          assetId: input.assetId,
          assetName,
          draftedByTeamId: input.teamId,
          draftedByTeamName: team?.name || "Unknown Team",
        });
      } catch (wishlistError) {
        // Log but don't fail the draft pick if wishlist cleanup fails
        console.warn('[DraftRouter] Failed to clean up wishlists (table may not exist yet):', wishlistError);
      }

      // Advance to next pick (also handles final-draft completion bookkeeping)
      const advanceStart = Date.now();
      const draftCompletedNow = await advanceDraftPick(input.leagueId);
      logDraftTiming("makeDraftPick:advanceDraftPick", {
        leagueId: input.leagueId,
        draftCompletedNow,
        durationMs: Date.now() - advanceStart,
      });

      // Stop current timer for this pick
      draftTimerManager.stopTimer(input.leagueId);

      if (draftCompletedNow) {
        // Ensure timer fully stopped and notify all clients
        draftTimerManager.stopTimer(input.leagueId);
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

      logDraftTiming("makeDraftPick:complete", {
        leagueId: input.leagueId,
        teamId: input.teamId,
        assetType: input.assetType,
        assetId: input.assetId,
        draftCompletedNow,
        totalDurationMs: Date.now() - timingStart,
      });

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

      // Reset auto-pick status for all teams before starting draft
      await db
        .update(teams)
        .set({
          autoPickEnabled: 0,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(teams.leagueId, input.leagueId));

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
      includeStats: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const leagueTeams = await db
        .select({
          teamId: teams.id,
          teamName: teams.name,
          userName: users.name,
          userAvatarUrl: users.avatarUrl,
        })
        .from(teams)
        .leftJoin(users, eq(teams.userId, users.id))
        .where(eq(teams.leagueId, input.leagueId));
      const teamIds = leagueTeams.map((t) => t.teamId);
      const teamMap = new Map<number, { name: string; userName: string | null; userAvatarUrl: string | null }>();
      leagueTeams.forEach(t => teamMap.set(t.teamId, { name: t.teamName, userName: t.userName, userAvatarUrl: t.userAvatarUrl }));
      const teamCount = Math.max(teamIds.length, 1);

      const includeStats = input.includeStats ?? true;

      // Fetch all draft picks for this league (fall back gracefully if table missing)
      let picks: DraftPickRow[] = [];
      try {
        picks = await db
          .select()
          .from(draftPicks)
          .where(eq(draftPicks.leagueId, input.leagueId))
          .orderBy(draftPicks.pickNumber);
      } catch (error) {
        console.error(
          `[draft.getAllDraftPicks] Failed to query draftPicks for league ${input.leagueId}:`,
          error
        );
        picks = [];
      }

      if (picks.length === 0 && teamIds.length > 0) {
        const rosterEntries = await db
          .select({
            teamId: rosters.teamId,
            assetType: rosters.assetType,
            assetId: rosters.assetId,
            acquiredVia: rosters.acquiredVia,
            createdAt: rosters.createdAt,
          })
          .from(rosters)
          .where(
            and(
              inArray(rosters.teamId, teamIds),
              eq(rosters.acquiredVia, "draft")
            )
          )
          .orderBy(rosters.createdAt);

        picks = rosterEntries.map((entry, index) => ({
          leagueId: input.leagueId,
          teamId: entry.teamId,
          round: Math.floor(index / teamCount) + 1,
          pickNumber: index + 1,
          assetType: entry.assetType as "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand",
          assetId: entry.assetId,
          pickTime: entry.createdAt,
        }));

        console.warn(
          `[draft.getAllDraftPicks] No entries in draftPicks for league ${input.leagueId}; ` +
          `falling back to roster history (${rosterEntries.length} records)`
        );
      }

      // ========== BATCH FETCH ALL DATA UPFRONT (Performance Optimization) ==========
      // Instead of N+1 queries, we batch-fetch all assets and stats in ~10 queries total

      // Group asset IDs by type
      const manufacturerIds = picks.filter(p => p.assetType === 'manufacturer').map(p => p.assetId);
      const cannabisStrainIds = picks.filter(p => p.assetType === 'cannabis_strain').map(p => p.assetId);
      const productIds = picks.filter(p => p.assetType === 'product').map(p => p.assetId);
      const pharmacyIds = picks.filter(p => p.assetType === 'pharmacy').map(p => p.assetId);
      const brandIds = picks.filter(p => p.assetType === 'brand').map(p => p.assetId);

      // Batch fetch all assets (parallel)
      const [mfgData, strainData, productData, pharmacyData, brandData] = await Promise.all([
        manufacturerIds.length > 0 
          ? db.select({ id: manufacturers.id, name: manufacturers.name, logoUrl: manufacturers.logoUrl })
              .from(manufacturers).where(inArray(manufacturers.id, manufacturerIds))
          : Promise.resolve([]),
        cannabisStrainIds.length > 0
          ? db.select({ id: cannabisStrains.id, name: cannabisStrains.name, imageUrl: cannabisStrains.imageUrl })
              .from(cannabisStrains).where(inArray(cannabisStrains.id, cannabisStrainIds))
          : Promise.resolve([]),
        productIds.length > 0
          ? db.select({ id: strains.id, name: strains.name, imageUrl: strains.imageUrl })
              .from(strains).where(inArray(strains.id, productIds))
          : Promise.resolve([]),
        pharmacyIds.length > 0
          ? db.select({ id: pharmacies.id, name: pharmacies.name, logoUrl: pharmacies.logoUrl })
              .from(pharmacies).where(inArray(pharmacies.id, pharmacyIds))
          : Promise.resolve([]),
        brandIds.length > 0
          ? db.select({ id: brands.id, name: brands.name, logoUrl: brands.logoUrl })
              .from(brands).where(inArray(brands.id, brandIds))
          : Promise.resolve([]),
      ]);

      // Build lookup maps
      const mfgMap = new Map(mfgData.map(m => [m.id, { name: m.name, imageUrl: m.logoUrl }]));
      const strainMap = new Map(strainData.map(s => [s.id, { name: s.name, imageUrl: s.imageUrl }]));
      const productMap = new Map(productData.map(p => [p.id, { name: p.name, imageUrl: p.imageUrl }]));
      const pharmacyMap = new Map(pharmacyData.map(p => [p.id, { name: p.name, imageUrl: p.logoUrl }]));
      const brandMap = new Map(brandData.map(b => [b.id, { name: b.name, imageUrl: b.logoUrl }]));

      // Stats maps (only fetch if includeStats is true)
      type StatsData = { lastWeekPoints: number | null; trendPercent: number | null };
      const mfgStatsMap = new Map<number, StatsData>();
      const strainStatsMap = new Map<number, StatsData>();
      const productStatsMap = new Map<number, StatsData>();
      const pharmacyStatsMap = new Map<number, StatsData>();
      const brandStatsMap = new Map<number, StatsData>();

      if (includeStats) {
        const lastWeek = input.week - 1;
        const twoWeeksAgo = input.week - 2;

        // Batch fetch all weekly stats (parallel)
        const [mfgStats1, mfgStats2, strainStats1, strainStats2, productStats1, productStats2, pharmStats1, pharmStats2, brandStats1, brandStats2] = await Promise.all([
          manufacturerIds.length > 0
            ? db.select({ id: manufacturerWeeklyStats.manufacturerId, pts: manufacturerWeeklyStats.totalPoints })
                .from(manufacturerWeeklyStats)
                .where(and(inArray(manufacturerWeeklyStats.manufacturerId, manufacturerIds), eq(manufacturerWeeklyStats.year, input.year), eq(manufacturerWeeklyStats.week, lastWeek)))
            : Promise.resolve([]),
          manufacturerIds.length > 0
            ? db.select({ id: manufacturerWeeklyStats.manufacturerId, pts: manufacturerWeeklyStats.totalPoints })
                .from(manufacturerWeeklyStats)
                .where(and(inArray(manufacturerWeeklyStats.manufacturerId, manufacturerIds), eq(manufacturerWeeklyStats.year, input.year), eq(manufacturerWeeklyStats.week, twoWeeksAgo)))
            : Promise.resolve([]),
          cannabisStrainIds.length > 0
            ? db.select({ id: cannabisStrainWeeklyStats.cannabisStrainId, pts: cannabisStrainWeeklyStats.totalPoints })
                .from(cannabisStrainWeeklyStats)
                .where(and(inArray(cannabisStrainWeeklyStats.cannabisStrainId, cannabisStrainIds), eq(cannabisStrainWeeklyStats.year, input.year), eq(cannabisStrainWeeklyStats.week, lastWeek)))
            : Promise.resolve([]),
          cannabisStrainIds.length > 0
            ? db.select({ id: cannabisStrainWeeklyStats.cannabisStrainId, pts: cannabisStrainWeeklyStats.totalPoints })
                .from(cannabisStrainWeeklyStats)
                .where(and(inArray(cannabisStrainWeeklyStats.cannabisStrainId, cannabisStrainIds), eq(cannabisStrainWeeklyStats.year, input.year), eq(cannabisStrainWeeklyStats.week, twoWeeksAgo)))
            : Promise.resolve([]),
          productIds.length > 0
            ? db.select({ id: strainWeeklyStats.strainId, pts: strainWeeklyStats.totalPoints })
                .from(strainWeeklyStats)
                .where(and(inArray(strainWeeklyStats.strainId, productIds), eq(strainWeeklyStats.year, input.year), eq(strainWeeklyStats.week, lastWeek)))
            : Promise.resolve([]),
          productIds.length > 0
            ? db.select({ id: strainWeeklyStats.strainId, pts: strainWeeklyStats.totalPoints })
                .from(strainWeeklyStats)
                .where(and(inArray(strainWeeklyStats.strainId, productIds), eq(strainWeeklyStats.year, input.year), eq(strainWeeklyStats.week, twoWeeksAgo)))
            : Promise.resolve([]),
          pharmacyIds.length > 0
            ? db.select({ id: pharmacyWeeklyStats.pharmacyId, pts: pharmacyWeeklyStats.totalPoints })
                .from(pharmacyWeeklyStats)
                .where(and(inArray(pharmacyWeeklyStats.pharmacyId, pharmacyIds), eq(pharmacyWeeklyStats.year, input.year), eq(pharmacyWeeklyStats.week, lastWeek)))
            : Promise.resolve([]),
          pharmacyIds.length > 0
            ? db.select({ id: pharmacyWeeklyStats.pharmacyId, pts: pharmacyWeeklyStats.totalPoints })
                .from(pharmacyWeeklyStats)
                .where(and(inArray(pharmacyWeeklyStats.pharmacyId, pharmacyIds), eq(pharmacyWeeklyStats.year, input.year), eq(pharmacyWeeklyStats.week, twoWeeksAgo)))
            : Promise.resolve([]),
          brandIds.length > 0
            ? db.select({ id: brandWeeklyStats.brandId, pts: brandWeeklyStats.totalPoints })
                .from(brandWeeklyStats)
                .where(and(inArray(brandWeeklyStats.brandId, brandIds), eq(brandWeeklyStats.year, input.year), eq(brandWeeklyStats.week, lastWeek)))
            : Promise.resolve([]),
          brandIds.length > 0
            ? db.select({ id: brandWeeklyStats.brandId, pts: brandWeeklyStats.totalPoints })
                .from(brandWeeklyStats)
                .where(and(inArray(brandWeeklyStats.brandId, brandIds), eq(brandWeeklyStats.year, input.year), eq(brandWeeklyStats.week, twoWeeksAgo)))
            : Promise.resolve([]),
        ]);

        // Build stats lookup maps with trend calculation
        const buildStatsMap = (
          week1: { id: number; pts: number }[],
          week2: { id: number; pts: number }[],
          targetMap: Map<number, StatsData>
        ) => {
          const week2Map = new Map(week2.map(s => [s.id, s.pts]));
          for (const stat of week1) {
            const prev = week2Map.get(stat.id);
            const trend = prev && prev > 0 ? ((stat.pts - prev) / prev) * 100 : null;
            targetMap.set(stat.id, { lastWeekPoints: stat.pts, trendPercent: trend });
          }
        };

        buildStatsMap(mfgStats1, mfgStats2, mfgStatsMap);
        buildStatsMap(strainStats1, strainStats2, strainStatsMap);
        buildStatsMap(productStats1, productStats2, productStatsMap);
        buildStatsMap(pharmStats1, pharmStats2, pharmacyStatsMap);
        buildStatsMap(brandStats1, brandStats2, brandStatsMap);
      }

      // Build enriched picks using Maps (O(1) lookups)
      const enrichedPicks = picks.map((pick) => {
        let assetName = "Unknown";
        let imageUrl: string | null = null;
        let lastWeekPoints: number | null = null;
        let trendPercent: number | null = null;

        if (pick.assetType === 'manufacturer') {
          const asset = mfgMap.get(pick.assetId);
          assetName = asset?.name || "Unknown";
          imageUrl = asset?.imageUrl || null;
          const stats = mfgStatsMap.get(pick.assetId);
          if (stats) { lastWeekPoints = stats.lastWeekPoints; trendPercent = stats.trendPercent; }
        } else if (pick.assetType === 'cannabis_strain') {
          const asset = strainMap.get(pick.assetId);
          assetName = asset?.name || "Unknown";
          imageUrl = asset?.imageUrl || null;
          const stats = strainStatsMap.get(pick.assetId);
          if (stats) { lastWeekPoints = stats.lastWeekPoints; trendPercent = stats.trendPercent; }
        } else if (pick.assetType === 'product') {
          const asset = productMap.get(pick.assetId);
          assetName = asset?.name || "Unknown";
          imageUrl = asset?.imageUrl || null;
          const stats = productStatsMap.get(pick.assetId);
          if (stats) { lastWeekPoints = stats.lastWeekPoints; trendPercent = stats.trendPercent; }
        } else if (pick.assetType === 'pharmacy') {
          const asset = pharmacyMap.get(pick.assetId);
          assetName = asset?.name || "Unknown";
          imageUrl = asset?.imageUrl || null;
          const stats = pharmacyStatsMap.get(pick.assetId);
          if (stats) { lastWeekPoints = stats.lastWeekPoints; trendPercent = stats.trendPercent; }
        } else if (pick.assetType === 'brand') {
          const asset = brandMap.get(pick.assetId);
          assetName = asset?.name || "Unknown";
          imageUrl = asset?.imageUrl || null;
          const stats = brandStatsMap.get(pick.assetId);
          if (stats) { lastWeekPoints = stats.lastWeekPoints; trendPercent = stats.trendPercent; }
        }

        const teamData = teamMap.get(pick.teamId);
        return {
          pickNumber: pick.pickNumber,
          round: pick.round,
          teamId: pick.teamId,
          teamName: teamData?.name || "Unknown Team",
          userName: teamData?.userName || null,
          userAvatarUrl: teamData?.userAvatarUrl || null,
          assetType: pick.assetType,
          assetId: pick.assetId,
          assetName,
          imageUrl,
          lastWeekPoints,
          trendPercent,
          pickTime: pick.pickTime,
        };
      });

      return enrichedPicks;
    }),

  /**
   * Get auto-pick status for a team
   */
  getAutoPickStatus: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [team] = await db
        .select({ autoPickEnabled: teams.autoPickEnabled })
        .from(teams)
        .where(eq(teams.id, input.teamId))
        .limit(1);

      if (!team) {
        throw new Error("Team not found");
      }

      return { autoPickEnabled: team.autoPickEnabled === 1 };
    }),

  /**
   * Toggle auto-pick status for a team (user can manually enable/disable)
   */
  setAutoPickStatus: protectedProcedure
    .input(z.object({
      teamId: z.number(),
      enabled: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user owns this team
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, input.teamId))
        .limit(1);

      if (!team) {
        throw new Error("Team not found");
      }

      if (team.userId !== ctx.user.id) {
        throw new Error("You can only modify your own team's auto-pick settings");
      }

      // Update auto-pick status
      await db
        .update(teams)
        .set({
          autoPickEnabled: input.enabled ? 1 : 0,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(teams.id, input.teamId));

      console.log(`[Draft] Auto-pick ${input.enabled ? 'enabled' : 'disabled'} for team ${input.teamId} by user ${ctx.user.id}`);

      // Notify other clients in the draft room
      wsManager.broadcastToDraftRoom(team.leagueId, {
        type: input.enabled ? 'auto_pick_enabled' : 'auto_pick_disabled',
        teamId: input.teamId,
        teamName: team.name,
        reason: 'manual',
        timestamp: Date.now(),
      });

      return { success: true, autoPickEnabled: input.enabled };
    }),

  /**
   * Reset all teams' auto-pick status for a league (used when starting a new draft)
   */
  resetAutoPickStatus: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user is commissioner
      const [league] = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (!league) {
        throw new Error("League not found");
      }

      if (league.commissionerUserId !== ctx.user.id) {
        throw new Error("Only the commissioner can reset auto-pick status");
      }

      // Reset auto-pick for all teams in the league
      await db
        .update(teams)
        .set({
          autoPickEnabled: 0,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(teams.leagueId, input.leagueId));

      console.log(`[Draft] Auto-pick status reset for all teams in league ${input.leagueId}`);

      return { success: true };
    }),
});
