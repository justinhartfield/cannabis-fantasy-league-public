import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { weeklyLineups, weeklyTeamScores, rosters, manufacturers, cannabisStrains, strains, pharmacies, brands, teams, leagues } from "../drizzle/schema";

/**
 * Lineup Router
 * 
 * Handles weekly lineup management:
 * - Fetch current lineup
 * - Update lineup
 * - Lock/unlock lineup
 */
export const lineupRouter = router({
  /**
   * Get weekly lineup with asset details
   */
  getWeeklyLineup: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        year: z.number(),
        week: z.number(),
      })
    )
    .query(async ({ input }) => {
      console.log('[getWeeklyLineup] Input:', input);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch lineup
      let [lineup] = await db
        .select()
        .from(weeklyLineups)
        .where(
          and(
            eq(weeklyLineups.teamId, input.teamId),
            eq(weeklyLineups.year, input.year),
            eq(weeklyLineups.week, input.week)
          )
        )
        .limit(1);

      if (!lineup) {
        // Try to auto-populate from roster first
        console.log(`[getWeeklyLineup] No lineup found for team ${input.teamId}, attempting auto-populate from roster...`);
        
        const teamRoster = await db
          .select()
          .from(rosters)
          .where(eq(rosters.teamId, input.teamId));

        // Group roster by asset type
        const rosterMfgs = teamRoster.filter(r => r.assetType === 'manufacturer');
        const rosterStrains = teamRoster.filter(r => r.assetType === 'cannabis_strain');
        const rosterProducts = teamRoster.filter(r => r.assetType === 'product');
        const rosterPharmacies = teamRoster.filter(r => r.assetType === 'pharmacy');
        const rosterBrands = teamRoster.filter(r => r.assetType === 'brand');

        // Build lineup from roster
        const lineupData: any = {
          teamId: input.teamId,
          year: input.year,
          week: input.week,
          isLocked: 0,
          mfg1Id: rosterMfgs[0]?.assetId || null,
          mfg2Id: rosterMfgs[1]?.assetId || null,
          cstr1Id: rosterStrains[0]?.assetId || null,
          cstr2Id: rosterStrains[1]?.assetId || null,
          prd1Id: rosterProducts[0]?.assetId || null,
          prd2Id: rosterProducts[1]?.assetId || null,
          phm1Id: rosterPharmacies[0]?.assetId || null,
          phm2Id: rosterPharmacies[1]?.assetId || null,
          brd1Id: rosterBrands[0]?.assetId || null,
          flexId: null,
          flexType: null,
        };

        // Find a flex candidate from remaining roster
        const flexCandidates = [
          ...rosterMfgs.slice(2),
          ...rosterStrains.slice(2),
          ...rosterProducts.slice(2),
          ...rosterPharmacies.slice(2),
          ...rosterBrands.slice(1),
        ];
        if (flexCandidates[0]) {
          lineupData.flexId = flexCandidates[0].assetId;
          lineupData.flexType = flexCandidates[0].assetType;
        }

        console.log(`[getWeeklyLineup] Auto-populating lineup with ${teamRoster.length} roster players`);

        const [inserted] = await db.insert(weeklyLineups).values(lineupData).returning();
        lineup = inserted;
      }

      // Fetch weekly team scores for this lineup
      const [teamScores] = await db
        .select()
        .from(weeklyTeamScores)
        .where(
          and(
            eq(weeklyTeamScores.teamId, input.teamId),
            eq(weeklyTeamScores.year, input.year),
            eq(weeklyTeamScores.week, input.week)
          )
        )
        .limit(1);

      // Fetch asset names for lineup
      const fetchAssetName = async (assetType: string | null, assetId: number | null) => {
        if (!assetId || !assetType) return null;

        switch (assetType) {
          case "manufacturer": {
            const [mfg] = await db.select().from(manufacturers).where(eq(manufacturers.id, assetId)).limit(1);
            return mfg?.name || null;
          }
          case "cannabis_strain": {
            const [strain] = await db.select().from(cannabisStrains).where(eq(cannabisStrains.id, assetId)).limit(1);
            return strain?.name || null;
          }
          case "product": {
            const [product] = await db.select().from(strains).where(eq(strains.id, assetId)).limit(1);
            return product?.name || null;
          }
          case "pharmacy": {
            const [phm] = await db.select().from(pharmacies).where(eq(pharmacies.id, assetId)).limit(1);
            return phm?.name || null;
          }
          case "brand": {
            const [brand] = await db.select().from(brands).where(eq(brands.id, assetId)).limit(1);
            return brand?.name || null;
          }
          default:
            return null;
        }
      };

      // Build lineup array with asset names and actual points
      const lineupData = await Promise.all([
        { position: "MFG1", assetType: "manufacturer" as const, assetId: lineup.mfg1Id, points: teamScores?.mfg1Points || 0 },
        { position: "MFG2", assetType: "manufacturer" as const, assetId: lineup.mfg2Id, points: teamScores?.mfg2Points || 0 },
        { position: "CSTR1", assetType: "cannabis_strain" as const, assetId: lineup.cstr1Id, points: teamScores?.cstr1Points || 0 },
        { position: "CSTR2", assetType: "cannabis_strain" as const, assetId: lineup.cstr2Id, points: teamScores?.cstr2Points || 0 },
        { position: "PRD1", assetType: "product" as const, assetId: lineup.prd1Id, points: teamScores?.prd1Points || 0 },
        { position: "PRD2", assetType: "product" as const, assetId: lineup.prd2Id, points: teamScores?.prd2Points || 0 },
        { position: "PHM1", assetType: "pharmacy" as const, assetId: lineup.phm1Id, points: teamScores?.phm1Points || 0 },
        { position: "PHM2", assetType: "pharmacy" as const, assetId: lineup.phm2Id, points: teamScores?.phm2Points || 0 },
        { position: "BRD1", assetType: "brand" as const, assetId: lineup.brd1Id, points: teamScores?.brd1Points || 0 },
        { position: "FLEX", assetType: lineup.flexType, assetId: lineup.flexId, points: teamScores?.flexPoints || 0 },
      ].map(async (slot) => ({
        ...slot,
        assetName: await fetchAssetName(slot.assetType, slot.assetId),
        locked: lineup.isLocked || false,
      })));

      const result = {
        teamId: input.teamId,
        year: input.year,
        week: input.week,
        isLocked: lineup.isLocked || false,
        captainId: lineup.captainId,
        captainType: lineup.captainType as "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand" | null,
        lineup: lineupData,
      };
      console.log('[getWeeklyLineup] Returning lineup:', JSON.stringify(result, null, 2));
      return result;
    }),

  /**
   * Update weekly lineup
   */
  updateLineup: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        year: z.number(),
        week: z.number(),
        lineup: z.object({
          mfg1Id: z.number().nullable(),
          mfg2Id: z.number().nullable(),
          cstr1Id: z.number().nullable(),
          cstr2Id: z.number().nullable(),
          prd1Id: z.number().nullable(),
          prd2Id: z.number().nullable(),
          phm1Id: z.number().nullable(),
          phm2Id: z.number().nullable(),
          flexId: z.number().nullable(),
          flexType: z
            .enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"])
            .nullable(),
          captainId: z.number().optional().nullable(),
          captainType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]).optional().nullable(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      console.log('[updateLineup] Received input:', JSON.stringify(input, null, 2));
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if lineup exists
      const [existing] = await db
        .select()
        .from(weeklyLineups)
        .where(
          and(
            eq(weeklyLineups.teamId, input.teamId),
            eq(weeklyLineups.year, input.year),
            eq(weeklyLineups.week, input.week)
          )
        )
        .limit(1);

      if (existing) {
        // Check if locked
        if (existing.isLocked) {
          throw new Error("Lineup is locked and cannot be modified");
        }

        // Update existing lineup
        await db
          .update(weeklyLineups)
          .set({
            mfg1Id: input.lineup.mfg1Id,
            mfg2Id: input.lineup.mfg2Id,
            cstr1Id: input.lineup.cstr1Id,
            cstr2Id: input.lineup.cstr2Id,
            prd1Id: input.lineup.prd1Id,
            prd2Id: input.lineup.prd2Id,
            phm1Id: input.lineup.phm1Id,
            phm2Id: input.lineup.phm2Id,
            flexId: input.lineup.flexId,
            flexType: input.lineup.flexType,
            captainId: input.lineup.captainId,
            captainType: input.lineup.captainType,
          })
          .where(eq(weeklyLineups.id, existing.id));
        console.log('[updateLineup] Updated existing lineup:', existing.id);
      } else {
        // Create new lineup
        await db.insert(weeklyLineups).values({
          teamId: input.teamId,
          year: input.year,
          week: input.week,
          mfg1Id: input.lineup.mfg1Id,
          mfg2Id: input.lineup.mfg2Id,
          cstr1Id: input.lineup.cstr1Id,
          cstr2Id: input.lineup.cstr2Id,
          prd1Id: input.lineup.prd1Id,
          prd2Id: input.lineup.prd2Id,
          phm1Id: input.lineup.phm1Id,
          phm2Id: input.lineup.phm2Id,
          flexId: input.lineup.flexId,
          flexType: input.lineup.flexType,
          captainId: input.lineup.captainId,
          captainType: input.lineup.captainType,
          isLocked: 0,
        });
        console.log('[updateLineup] Created new lineup');
      }

      console.log('[updateLineup] Save successful');
      return { success: true };
    }),

  /**
   * Lock/unlock lineup
   */
  toggleLock: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        year: z.number(),
        week: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [lineup] = await db
        .select()
        .from(weeklyLineups)
        .where(
          and(
            eq(weeklyLineups.teamId, input.teamId),
            eq(weeklyLineups.year, input.year),
            eq(weeklyLineups.week, input.week)
          )
        )
        .limit(1);

      if (!lineup) {
        throw new Error("Lineup not found");
      }

      const newLockState = !lineup.isLocked;

      await db
        .update(weeklyLineups)
        .set({ isLocked: newLockState ? 1 : 0 })
        .where(eq(weeklyLineups.id, lineup.id));

      return { success: true, isLocked: newLockState };
    }),

  /**
   * Set captain for a lineup
   */
  setCaptain: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        year: z.number(),
        week: z.number(),
        captainId: z.number(),
        captainType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if lineup exists
      const [existing] = await db
        .select()
        .from(weeklyLineups)
        .where(
          and(
            eq(weeklyLineups.teamId, input.teamId),
            eq(weeklyLineups.year, input.year),
            eq(weeklyLineups.week, input.week)
          )
        )
        .limit(1);

      if (!existing) {
        // Create new lineup if it doesn't exist
        await db.insert(weeklyLineups).values({
          teamId: input.teamId,
          year: input.year,
          week: input.week,
          captainId: input.captainId,
          captainType: input.captainType,
          isLocked: 0,
        });
      } else {
        if (existing.isLocked) {
          throw new Error("Lineup is locked");
        }
        // Update captain
        await db
          .update(weeklyLineups)
          .set({
            captainId: input.captainId,
            captainType: input.captainType,
          })
          .where(eq(weeklyLineups.id, existing.id));
      }

      // Verify the captain was saved by reading it back
      const verifyLineup = await db
        .select({ captainId: weeklyLineups.captainId, captainType: weeklyLineups.captainType })
        .from(weeklyLineups)
        .where(
          and(
            eq(weeklyLineups.teamId, input.teamId),
            eq(weeklyLineups.year, input.year),
            eq(weeklyLineups.week, input.week)
          )
        )
        .limit(1);

      console.log(`[setCaptain] Verified lineup captain: captainId=${verifyLineup[0]?.captainId}, captainType=${verifyLineup[0]?.captainType}`);

      // Trigger score recalculation to apply captain bonus
      // TODO: Fix 500 error caused by dynamic import or circular dependency
      console.log(`[setCaptain] Captain set for team ${input.teamId}. Score recalculation skipped.`);

      return { success: true };
    }),
});
