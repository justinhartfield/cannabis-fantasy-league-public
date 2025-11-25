import { z } from "zod";
import { eq, and, inArray, asc, sql } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { 
  autoDraftBoards, 
  teams, 
  manufacturers, 
  cannabisStrains, 
  strains, 
  pharmacies, 
  brands,
  rosters 
} from "../drizzle/schema";

/**
 * Auto Draft Board Router
 * 
 * Handles user's auto-draft wishlist operations:
 * - Get auto-draft board for a team
 * - Add/remove assets from wishlist
 * - Reorder wishlist priorities
 * - Clear entire wishlist
 */
export const autoDraftRouter = router({
  /**
   * Get team's auto-draft board (wishlist) with asset details
   */
  getAutoDraftBoard: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Fetch all wishlist entries for the team, ordered by priority
      const wishlistEntries = await db
        .select()
        .from(autoDraftBoards)
        .where(eq(autoDraftBoards.teamId, input.teamId))
        .orderBy(asc(autoDraftBoards.priority));

      // Get all team IDs in the same league to check if assets are already drafted
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, input.teamId))
        .limit(1);

      let draftedAssetIds: Set<string> = new Set();
      if (team) {
        const leagueTeams = await db
          .select({ teamId: teams.id })
          .from(teams)
          .where(eq(teams.leagueId, team.leagueId));

        const teamIds = leagueTeams.map((t) => t.teamId);
        
        if (teamIds.length > 0) {
          const draftedAssets = await db
            .select({ assetType: rosters.assetType, assetId: rosters.assetId })
            .from(rosters)
            .where(inArray(rosters.teamId, teamIds));

          draftedAssets.forEach((asset) => {
            draftedAssetIds.add(`${asset.assetType}-${asset.assetId}`);
          });
        }
      }

      // Fetch asset details for each wishlist entry
      const wishlistWithDetails = await Promise.all(
        wishlistEntries.map(async (entry) => {
          let assetDetails: { name: string; imageUrl?: string | null } | null = null;

          switch (entry.assetType) {
            case "manufacturer": {
              const [mfg] = await db
                .select()
                .from(manufacturers)
                .where(eq(manufacturers.id, entry.assetId))
                .limit(1);
              assetDetails = mfg ? { name: mfg.name, imageUrl: mfg.logoUrl } : null;
              break;
            }
            case "cannabis_strain": {
              const [strain] = await db
                .select()
                .from(cannabisStrains)
                .where(eq(cannabisStrains.id, entry.assetId))
                .limit(1);
              assetDetails = strain ? { name: strain.name, imageUrl: strain.imageUrl } : null;
              break;
            }
            case "product": {
              const [product] = await db
                .select()
                .from(strains)
                .where(eq(strains.id, entry.assetId))
                .limit(1);
              assetDetails = product ? { name: product.name, imageUrl: null } : null;
              break;
            }
            case "pharmacy": {
              const [phm] = await db
                .select()
                .from(pharmacies)
                .where(eq(pharmacies.id, entry.assetId))
                .limit(1);
              assetDetails = phm ? { name: phm.name, imageUrl: phm.logoUrl } : null;
              break;
            }
            case "brand": {
              const [brand] = await db
                .select()
                .from(brands)
                .where(eq(brands.id, entry.assetId))
                .limit(1);
              assetDetails = brand ? { name: brand.name, imageUrl: brand.logoUrl } : null;
              break;
            }
          }

          const isDrafted = draftedAssetIds.has(`${entry.assetType}-${entry.assetId}`);

          return {
            id: entry.id,
            assetType: entry.assetType,
            assetId: entry.assetId,
            priority: entry.priority,
            name: assetDetails?.name || "Unknown",
            imageUrl: assetDetails?.imageUrl || null,
            isDrafted,
          };
        })
      );

      return wishlistWithDetails;
    }),

  /**
   * Add asset to auto-draft board
   * Will be added at the end of the list (highest priority number)
   */
  addToAutoDraftBoard: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        assetType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
        assetId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if asset already exists in wishlist
      const existing = await db
        .select()
        .from(autoDraftBoards)
        .where(
          and(
            eq(autoDraftBoards.teamId, input.teamId),
            eq(autoDraftBoards.assetType, input.assetType),
            eq(autoDraftBoards.assetId, input.assetId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: false, error: "Asset already in wishlist" };
      }

      // Get the highest priority number for this team
      const maxPriorityResult = await db
        .select({ maxPriority: sql<number>`COALESCE(MAX(${autoDraftBoards.priority}), 0)` })
        .from(autoDraftBoards)
        .where(eq(autoDraftBoards.teamId, input.teamId));

      const newPriority = (maxPriorityResult[0]?.maxPriority || 0) + 1;

      // Insert the new entry
      const [newEntry] = await db
        .insert(autoDraftBoards)
        .values({
          teamId: input.teamId,
          assetType: input.assetType,
          assetId: input.assetId,
          priority: newPriority,
        })
        .$returningId();

      return { success: true, id: newEntry.id, priority: newPriority };
    }),

  /**
   * Remove asset from auto-draft board
   */
  removeFromAutoDraftBoard: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        assetType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
        assetId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(autoDraftBoards)
        .where(
          and(
            eq(autoDraftBoards.teamId, input.teamId),
            eq(autoDraftBoards.assetType, input.assetType),
            eq(autoDraftBoards.assetId, input.assetId)
          )
        );

      return { success: true };
    }),

  /**
   * Reorder auto-draft board by updating priority
   * Accepts a list of asset IDs in the desired order
   */
  reorderAutoDraftBoard: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        orderedIds: z.array(z.number()), // Array of autoDraftBoards.id in desired order
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Update priorities based on array index
      await Promise.all(
        input.orderedIds.map((id, index) =>
          db
            .update(autoDraftBoards)
            .set({ 
              priority: index + 1, 
              updatedAt: new Date().toISOString() 
            })
            .where(
              and(
                eq(autoDraftBoards.id, id),
                eq(autoDraftBoards.teamId, input.teamId) // Security: ensure user owns this entry
              )
            )
        )
      );

      return { success: true };
    }),

  /**
   * Move item to a specific position in the wishlist
   */
  moveToPosition: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        itemId: z.number(),
        newPosition: z.number(), // 1-based position
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get all current items ordered by priority
      const allItems = await db
        .select()
        .from(autoDraftBoards)
        .where(eq(autoDraftBoards.teamId, input.teamId))
        .orderBy(asc(autoDraftBoards.priority));

      // Find the item to move
      const itemIndex = allItems.findIndex((item) => item.id === input.itemId);
      if (itemIndex === -1) {
        throw new Error("Item not found in wishlist");
      }

      // Remove item from current position and insert at new position
      const [movedItem] = allItems.splice(itemIndex, 1);
      const insertIndex = Math.max(0, Math.min(input.newPosition - 1, allItems.length));
      allItems.splice(insertIndex, 0, movedItem);

      // Update all priorities
      await Promise.all(
        allItems.map((item, index) =>
          db
            .update(autoDraftBoards)
            .set({ 
              priority: index + 1, 
              updatedAt: new Date().toISOString() 
            })
            .where(eq(autoDraftBoards.id, item.id))
        )
      );

      return { success: true };
    }),

  /**
   * Clear entire auto-draft board for a team
   */
  clearAutoDraftBoard: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(autoDraftBoards)
        .where(eq(autoDraftBoards.teamId, input.teamId));

      return { success: true };
    }),

  /**
   * Get auto-draft board for current user's team in a league
   */
  getMyAutoDraftBoard: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get user's team in this league
      const [team] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)))
        .limit(1);

      if (!team) {
        return [];
      }

      // Fetch all wishlist entries for the team, ordered by priority
      const wishlistEntries = await db
        .select()
        .from(autoDraftBoards)
        .where(eq(autoDraftBoards.teamId, team.id))
        .orderBy(asc(autoDraftBoards.priority));

      // Get all drafted assets in this league
      const leagueTeams = await db
        .select({ teamId: teams.id })
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));

      const teamIds = leagueTeams.map((t) => t.teamId);
      
      let draftedAssetIds: Set<string> = new Set();
      if (teamIds.length > 0) {
        const draftedAssets = await db
          .select({ assetType: rosters.assetType, assetId: rosters.assetId })
          .from(rosters)
          .where(inArray(rosters.teamId, teamIds));

        draftedAssets.forEach((asset) => {
          draftedAssetIds.add(`${asset.assetType}-${asset.assetId}`);
        });
      }

      // Fetch asset details for each wishlist entry
      const wishlistWithDetails = await Promise.all(
        wishlistEntries.map(async (entry) => {
          let assetDetails: { name: string; imageUrl?: string | null } | null = null;

          switch (entry.assetType) {
            case "manufacturer": {
              const [mfg] = await db
                .select()
                .from(manufacturers)
                .where(eq(manufacturers.id, entry.assetId))
                .limit(1);
              assetDetails = mfg ? { name: mfg.name, imageUrl: mfg.logoUrl } : null;
              break;
            }
            case "cannabis_strain": {
              const [strain] = await db
                .select()
                .from(cannabisStrains)
                .where(eq(cannabisStrains.id, entry.assetId))
                .limit(1);
              assetDetails = strain ? { name: strain.name, imageUrl: strain.imageUrl } : null;
              break;
            }
            case "product": {
              const [product] = await db
                .select()
                .from(strains)
                .where(eq(strains.id, entry.assetId))
                .limit(1);
              assetDetails = product ? { name: product.name, imageUrl: null } : null;
              break;
            }
            case "pharmacy": {
              const [phm] = await db
                .select()
                .from(pharmacies)
                .where(eq(pharmacies.id, entry.assetId))
                .limit(1);
              assetDetails = phm ? { name: phm.name, imageUrl: phm.logoUrl } : null;
              break;
            }
            case "brand": {
              const [brand] = await db
                .select()
                .from(brands)
                .where(eq(brands.id, entry.assetId))
                .limit(1);
              assetDetails = brand ? { name: brand.name, imageUrl: brand.logoUrl } : null;
              break;
            }
          }

          const isDrafted = draftedAssetIds.has(`${entry.assetType}-${entry.assetId}`);

          return {
            id: entry.id,
            assetType: entry.assetType,
            assetId: entry.assetId,
            priority: entry.priority,
            name: assetDetails?.name || "Unknown",
            imageUrl: assetDetails?.imageUrl || null,
            isDrafted,
          };
        })
      );

      return wishlistWithDetails;
    }),

  /**
   * Add asset to auto-draft board for current user's team in a league
   */
  addToMyAutoDraftBoard: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        assetType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
        assetId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get user's team in this league
      const [team] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)))
        .limit(1);

      if (!team) {
        throw new Error("You don't have a team in this league");
      }

      // Check if asset already exists in wishlist
      const existing = await db
        .select()
        .from(autoDraftBoards)
        .where(
          and(
            eq(autoDraftBoards.teamId, team.id),
            eq(autoDraftBoards.assetType, input.assetType),
            eq(autoDraftBoards.assetId, input.assetId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: false, error: "Asset already in wishlist" };
      }

      // Get the highest priority number for this team
      const maxPriorityResult = await db
        .select({ maxPriority: sql<number>`COALESCE(MAX(${autoDraftBoards.priority}), 0)` })
        .from(autoDraftBoards)
        .where(eq(autoDraftBoards.teamId, team.id));

      const newPriority = (maxPriorityResult[0]?.maxPriority || 0) + 1;

      // Insert the new entry
      const [newEntry] = await db
        .insert(autoDraftBoards)
        .values({
          teamId: team.id,
          assetType: input.assetType,
          assetId: input.assetId,
          priority: newPriority,
        })
        .$returningId();

      return { success: true, id: newEntry.id, priority: newPriority };
    }),

  /**
   * Remove asset from auto-draft board for current user's team in a league
   */
  removeFromMyAutoDraftBoard: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        assetType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
        assetId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get user's team in this league
      const [team] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)))
        .limit(1);

      if (!team) {
        throw new Error("You don't have a team in this league");
      }

      await db
        .delete(autoDraftBoards)
        .where(
          and(
            eq(autoDraftBoards.teamId, team.id),
            eq(autoDraftBoards.assetType, input.assetType),
            eq(autoDraftBoards.assetId, input.assetId)
          )
        );

      return { success: true };
    }),

  /**
   * Check if an asset is in the user's wishlist
   */
  isInMyWishlist: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        assetType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
        assetId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get user's team in this league
      const [team] = await db
        .select()
        .from(teams)
        .where(and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)))
        .limit(1);

      if (!team) {
        return false;
      }

      const existing = await db
        .select()
        .from(autoDraftBoards)
        .where(
          and(
            eq(autoDraftBoards.teamId, team.id),
            eq(autoDraftBoards.assetType, input.assetType),
            eq(autoDraftBoards.assetId, input.assetId)
          )
        )
        .limit(1);

      return existing.length > 0;
    }),
});

