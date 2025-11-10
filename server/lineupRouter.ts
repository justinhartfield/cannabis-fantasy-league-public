import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { weeklyLineups, rosters, manufacturers, cannabisStrains, strains, pharmacies } from "../drizzle/schema";

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
        // Create empty lineup if it doesn't exist
        const [newLineup] = await db
          .insert(weeklyLineups)
          .values({
            teamId: input.teamId,
            year: input.year,
            week: input.week,
            isLocked: false,
          })
          .$returningId();

        return {
          teamId: input.teamId,
          year: input.year,
          week: input.week,
          isLocked: false,
          lineup: [
            { position: "MFG1", assetType: "manufacturer" as const, assetId: null, assetName: null, points: 0, locked: false },
            { position: "MFG2", assetType: "manufacturer" as const, assetId: null, assetName: null, points: 0, locked: false },
            { position: "CSTR1", assetType: "cannabis_strain" as const, assetId: null, assetName: null, points: 0, locked: false },
            { position: "CSTR2", assetType: "cannabis_strain" as const, assetId: null, assetName: null, points: 0, locked: false },
            { position: "PRD1", assetType: "product" as const, assetId: null, assetName: null, points: 0, locked: false },
            { position: "PRD2", assetType: "product" as const, assetId: null, assetName: null, points: 0, locked: false },
            { position: "PHM1", assetType: "pharmacy" as const, assetId: null, assetName: null, points: 0, locked: false },
            { position: "PHM2", assetType: "pharmacy" as const, assetId: null, assetName: null, points: 0, locked: false },
            { position: "FLEX", assetType: null, assetId: null, assetName: null, points: 0, locked: false },
          ],
        };
      }

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
          default:
            return null;
        }
      };

      // Build lineup array with asset names
      const lineupData = await Promise.all([
        { position: "MFG1", assetType: "manufacturer" as const, assetId: lineup.mfg1Id, points: 0 },
        { position: "MFG2", assetType: "manufacturer" as const, assetId: lineup.mfg2Id, points: 0 },
        { position: "CSTR1", assetType: "cannabis_strain" as const, assetId: lineup.cstr1Id, points: 0 },
        { position: "CSTR2", assetType: "cannabis_strain" as const, assetId: lineup.cstr2Id, points: 0 },
        { position: "PRD1", assetType: "product" as const, assetId: lineup.prd1Id, points: 0 },
        { position: "PRD2", assetType: "product" as const, assetId: lineup.prd2Id, points: 0 },
        { position: "PHM1", assetType: "pharmacy" as const, assetId: lineup.phm1Id, points: 0 },
        { position: "PHM2", assetType: "pharmacy" as const, assetId: lineup.phm2Id, points: 0 },
        { position: "FLEX", assetType: lineup.flexType, assetId: lineup.flexId, points: 0 },
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
          flexType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy"]).nullable(),
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
          isLocked: false,
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
        .set({ isLocked: newLockState })
        .where(eq(weeklyLineups.id, lineup.id));

      return { success: true, isLocked: newLockState };
    }),
});
