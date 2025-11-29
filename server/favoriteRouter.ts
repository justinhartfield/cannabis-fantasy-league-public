import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { userFavorites } from "../drizzle/schema";

export const favoriteRouter = router({
    /**
     * Toggle favorite status for an entity
     */
    toggleFavorite: protectedProcedure
        .input(
            z.object({
                entityType: z.enum(["brand"]), // Expandable for other types
                entityId: z.number(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const existing = await db
                .select()
                .from(userFavorites)
                .where(
                    and(
                        eq(userFavorites.userId, ctx.user.id),
                        eq(userFavorites.entityType, input.entityType),
                        eq(userFavorites.entityId, input.entityId)
                    )
                )
                .limit(1);

            if (existing.length > 0) {
                // Remove favorite
                await db
                    .delete(userFavorites)
                    .where(eq(userFavorites.id, existing[0].id));
                return { isFavorited: false };
            } else {
                // Add favorite
                await db.insert(userFavorites).values({
                    userId: ctx.user.id,
                    entityType: input.entityType,
                    entityId: input.entityId,
                });
                return { isFavorited: true };
            }
        }),

    /**
     * Check if an entity is favorited
     */
    checkFavoriteStatus: protectedProcedure
        .input(
            z.object({
                entityType: z.enum(["brand"]),
                entityId: z.number(),
            })
        )
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const existing = await db
                .select()
                .from(userFavorites)
                .where(
                    and(
                        eq(userFavorites.userId, ctx.user.id),
                        eq(userFavorites.entityType, input.entityType),
                        eq(userFavorites.entityId, input.entityId)
                    )
                )
                .limit(1);

            return { isFavorited: existing.length > 0 };
        }),

    /**
     * Get all favorites for a user by type
     */
    getFavorites: protectedProcedure
        .input(
            z.object({
                entityType: z.enum(["brand"]),
            })
        )
        .query(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const favorites = await db
                .select({ entityId: userFavorites.entityId })
                .from(userFavorites)
                .where(
                    and(
                        eq(userFavorites.userId, ctx.user.id),
                        eq(userFavorites.entityType, input.entityType)
                    )
                );

            return favorites.map(f => f.entityId);
        }),
});
