import { z } from "zod";
import { eq, and, notInArray, inArray, sql } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { manufacturers, cannabisStrains, strains, pharmacies, brands, rosters, leagues, teams, draftPicks } from "../drizzle/schema";
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
      let query = db.select().from(manufacturers);

      if (draftedIds.length > 0) {
        query = query.where(notInArray(manufacturers.id, draftedIds)) as any;
      }

      if (input.search) {
        query = query.where(sql`${manufacturers.name} LIKE ${`%${input.search}%`}`) as any;
      }

      const available = await query.limit(input.limit);

      return available.map((mfg) => ({
        id: mfg.id,
        name: mfg.name,
        productCount: mfg.productCount || 0,
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
      let query = db.select().from(cannabisStrains);

      if (draftedIds.length > 0) {
        query = query.where(notInArray(cannabisStrains.id, draftedIds)) as any;
      }

      if (input.search) {
        query = query.where(sql`${cannabisStrains.name} LIKE ${`%${input.search}%`}`) as any;
      }

      const available = await query.limit(input.limit);

      return available.map((strain) => ({
        id: strain.id,
        name: strain.name,
        type: strain.type || "Unknown",
        effects: parseJsonOrArray(strain.effects),
        flavors: parseJsonOrArray(strain.flavors),
        // TODO: Add more stats
      }));
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
      let query = db.select().from(strains);

      if (draftedIds.length > 0) {
        query = query.where(notInArray(strains.id, draftedIds)) as any;
      }

      if (input.search) {
        query = query.where(sql`${strains.name} LIKE ${`%${input.search}%`}`) as any;
      }

      const available = await query.limit(input.limit);

      return available.map((product) => ({
        id: product.id,
        name: product.name,
        manufacturer: product.manufacturer || "Unknown",
        thcContent: product.thcContent || 0,
        cbdContent: product.cbdContent || 0,
        favoriteCount: product.favoriteCount || 0,
        // TODO: Add more stats
      }));
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
      let query = db.select().from(pharmacies);

      if (draftedIds.length > 0) {
        query = query.where(notInArray(pharmacies.id, draftedIds)) as any;
      }

      if (input.search) {
        query = query.where(sql`${pharmacies.name} LIKE ${`%${input.search}%`}`) as any;
      }

      const available = await query.limit(input.limit);

      return available.map((phm) => ({
        id: phm.id,
        name: phm.name,
        city: phm.city || "Unknown",
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
      let query = db.select().from(brands);

      if (draftedIds.length > 0) {
        query = query.where(notInArray(brands.id, draftedIds)) as any;
      }

      if (input.search) {
        query = query.where(sql`${brands.name} LIKE ${`%${input.search}%`}`) as any;
      }

      const available = await query.limit(input.limit);

      return available.map((brand) => ({
        id: brand.id,
        name: brand.name,
        totalFavorites: brand.totalFavorites || 0,
        totalViews: brand.totalViews || 0,
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
});
