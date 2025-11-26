import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { rosters, manufacturers, cannabisStrains, strains, pharmacies, brands } from "../drizzle/schema";

/**
 * Roster Router
 * 
 * Handles roster management operations:
 * - Fetch team roster
 * - Add/remove players
 * - Get roster needs
 */
export const rosterRouter = router({
  /**
   * Get team roster with full asset details
   */
  getTeamRoster: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch all roster entries for the team
      const rosterEntries = await db
        .select()
        .from(rosters)
        .where(eq(rosters.teamId, input.teamId));

      // Fetch asset details for each roster entry
      const rosterWithDetails = await Promise.all(
        rosterEntries.map(async (entry) => {
          let assetDetails = null;

          switch (entry.assetType) {
            case "manufacturer": {
              const [mfg] = await db
                .select()
                .from(manufacturers)
                .where(eq(manufacturers.id, entry.assetId))
                .limit(1);
              assetDetails = mfg;
              break;
            }
            case "cannabis_strain": {
              const [strain] = await db
                .select()
                .from(cannabisStrains)
                .where(eq(cannabisStrains.id, entry.assetId))
                .limit(1);
              assetDetails = strain;
              break;
            }
            case "product": {
              const [product] = await db
                .select()
                .from(strains)
                .where(eq(strains.id, entry.assetId))
                .limit(1);
              assetDetails = product;
              break;
            }
            case "pharmacy": {
              const [phm] = await db
                .select()
                .from(pharmacies)
                .where(eq(pharmacies.id, entry.assetId))
                .limit(1);
              assetDetails = phm;
              break;
            }
            case "brand": {
              const [brand] = await db
                .select()
                .from(brands)
                .where(eq(brands.id, entry.assetId))
                .limit(1);
              assetDetails = brand;
              break;
            }
          }

          // Get imageUrl based on asset type (some use logoUrl, some use imageUrl)
          const imageUrl = entry.assetType === "manufacturer" || entry.assetType === "pharmacy" || entry.assetType === "brand"
            ? (assetDetails as any)?.logoUrl
            : (assetDetails as any)?.imageUrl;

          return {
            id: entry.id,
            assetType: entry.assetType,
            assetId: entry.assetId,
            assetName: assetDetails?.name || "Unknown",
            imageUrl: imageUrl || null,
            acquiredWeek: entry.acquiredWeek,
            acquiredVia: entry.acquiredVia,
            // TODO: Add performance metrics from weeklyTeamScores
            weeklyPoints: 0,
            seasonPoints: 0,
            trend: "stable" as const,
          };
        })
      );

      return rosterWithDetails;
    }),

  /**
   * Get roster needs (how many slots are filled for each position)
   */
  getRosterNeeds: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const rosterEntries = await db
        .select()
        .from(rosters)
        .where(eq(rosters.teamId, input.teamId));

      // Count by asset type
      const counts = {
        manufacturer: 0,
        cannabis_strain: 0,
        product: 0,
        pharmacy: 0,
        brand: 0,
      };

      rosterEntries.forEach((entry) => {
        if (entry.assetType in counts) {
          counts[entry.assetType as keyof typeof counts]++;
        }
      });

      return {
        manufacturer: { current: counts.manufacturer, max: 2 },
        cannabis_strain: { current: counts.cannabis_strain, max: 2 },
        product: { current: counts.product, max: 2 },
        pharmacy: { current: counts.pharmacy, max: 2 },
        brand: { current: counts.brand, max: 1 },
        flex: { current: 0, max: 1 }, // TODO: Calculate flex from lineup
      };
    }),

  /**
   * Add player to roster (used after draft or waiver claim)
   */
  addToRoster: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        assetType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
        assetId: z.number(),
        acquiredWeek: z.number(),
        acquiredVia: z.enum(["draft", "waiver", "trade", "free_agent"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [newEntry] = await db
        .insert(rosters)
        .values({
          teamId: input.teamId,
          assetType: input.assetType,
          assetId: input.assetId,
          acquiredWeek: input.acquiredWeek,
          acquiredVia: input.acquiredVia,
        })
        .$returningId();

      return { success: true, rosterId: newEntry.id };
    }),

  /**
   * Remove player from roster
   */
  removeFromRoster: protectedProcedure
    .input(
      z.object({
        rosterId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(rosters).where(eq(rosters.id, input.rosterId));

      return { success: true };
    }),

  /**
   * Get current user's roster for a league
   */
  getMyRoster: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // First get the user's team in this league
      const { teams } = await import("../drizzle/schema");
      console.log('[getMyRoster] Looking for team with leagueId:', input.leagueId, 'userId:', ctx.user.id);
      const [team] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)))
        .limit(1);

      console.log('[getMyRoster] Found team:', team);
      if (!team) {
        console.log('[getMyRoster] No team found, returning empty array');
        return [];
      }

      // Fetch all roster entries for the team
      const rosterEntries = await db
        .select()
        .from(rosters)
        .where(eq(rosters.teamId, team.id));

      // Fetch asset details for each roster entry
      const rosterWithDetails = await Promise.all(
        rosterEntries.map(async (entry) => {
          let assetDetails = null;

          switch (entry.assetType) {
            case "manufacturer": {
              const [mfg] = await db
                .select()
                .from(manufacturers)
                .where(eq(manufacturers.id, entry.assetId))
                .limit(1);
              assetDetails = mfg;
              break;
            }
            case "cannabis_strain": {
              const [strain] = await db
                .select()
                .from(cannabisStrains)
                .where(eq(cannabisStrains.id, entry.assetId))
                .limit(1);
              assetDetails = strain;
              break;
            }
            case "product": {
              const [product] = await db
                .select()
                .from(strains)
                .where(eq(strains.id, entry.assetId))
                .limit(1);
              assetDetails = product;
              break;
            }
            case "pharmacy": {
              const [phm] = await db
                .select()
                .from(pharmacies)
                .where(eq(pharmacies.id, entry.assetId))
                .limit(1);
              assetDetails = phm;
              break;
            }
            case "brand": {
              const [brand] = await db
                .select()
                .from(brands)
                .where(eq(brands.id, entry.assetId))
                .limit(1);
              assetDetails = brand;
              break;
            }
          }

          // Get imageUrl based on asset type (some use logoUrl, some use imageUrl)
          const imageUrl = entry.assetType === "manufacturer" || entry.assetType === "pharmacy" || entry.assetType === "brand"
            ? (assetDetails as any)?.logoUrl
            : (assetDetails as any)?.imageUrl;

          return {
            assetType: entry.assetType,
            assetId: entry.assetId,
            name: assetDetails?.name || "Unknown",
            imageUrl: imageUrl || null,
          };
        })
      );

      console.log('[getMyRoster] Returning roster:', JSON.stringify(rosterWithDetails));
      return rosterWithDetails;
    }),
});
