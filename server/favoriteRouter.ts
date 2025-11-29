import { z } from "zod";
import { eq, and, inArray, sql, notInArray } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
    userFavorites,
    brands,
    manufacturers,
    pharmacies,
    cannabisStrains,
    strains // For products
} from "../drizzle/schema";

export const favoriteRouter = router({
    /**
     * Set a favorite for a specific entity type.
     * Enforces "one favorite per type" rule by removing existing favorites of that type.
     */
    setFavorite: protectedProcedure
        .input(
            z.object({
                entityType: z.enum(["brand", "manufacturer", "pharmacy", "cannabis_strain"]),
                entityId: z.number(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            // 1. Remove any existing favorite for this user and entity type
            await db
                .delete(userFavorites)
                .where(
                    and(
                        eq(userFavorites.userId, ctx.user.id),
                        eq(userFavorites.entityType, input.entityType)
                    )
                );

            // 2. Insert the new favorite
            await db.insert(userFavorites).values({
                userId: ctx.user.id,
                entityType: input.entityType,
                entityId: input.entityId,
            });

            return { success: true };
        }),

    /**
     * Check if an entity is favorited
     */
    checkFavoriteStatus: protectedProcedure
        .input(
            z.object({
                entityType: z.enum(["brand", "manufacturer", "pharmacy", "cannabis_strain"]),
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
     * Get all favorites for a user (one per type)
     */
    getAllFavorites: protectedProcedure
        .query(async ({ ctx }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const favorites = await db
                .select()
                .from(userFavorites)
                .where(eq(userFavorites.userId, ctx.user.id));

            // Fetch details for each favorite
            const result = await Promise.all(favorites.map(async (fav) => {
                let name = "Unknown";
                let imageUrl: string | null = null;

                if (fav.entityType === 'brand') {
                    const [item] = await db.select({ name: brands.name, imageUrl: brands.logoUrl }).from(brands).where(eq(brands.id, fav.entityId)).limit(1);
                    if (item) { name = item.name; imageUrl = item.imageUrl; }
                } else if (fav.entityType === 'manufacturer') {
                    const [item] = await db.select({ name: manufacturers.name, imageUrl: manufacturers.logoUrl }).from(manufacturers).where(eq(manufacturers.id, fav.entityId)).limit(1);
                    if (item) { name = item.name; imageUrl = item.imageUrl; }
                } else if (fav.entityType === 'pharmacy') {
                    const [item] = await db.select({ name: pharmacies.name, imageUrl: pharmacies.logoUrl }).from(pharmacies).where(eq(pharmacies.id, fav.entityId)).limit(1);
                    if (item) { name = item.name; imageUrl = item.imageUrl; }
                } else if (fav.entityType === 'cannabis_strain') {
                    const [item] = await db.select({ name: cannabisStrains.name, imageUrl: cannabisStrains.imageUrl }).from(cannabisStrains).where(eq(cannabisStrains.id, fav.entityId)).limit(1);
                    if (item) { name = item.name; imageUrl = item.imageUrl; }
                }

                return {
                    ...fav,
                    name,
                    imageUrl
                };
            }));

            return result;
        }),

    /**
     * Search for entities to favorite
     */
    searchEntities: protectedProcedure
        .input(
            z.object({
                entityType: z.enum(["brand", "manufacturer", "pharmacy", "cannabis_strain"]),
                search: z.string().optional(),
                limit: z.number().default(20),
            })
        )
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const limit = input.limit;
            const search = input.search ? `%${input.search}%` : '%';

            if (input.entityType === 'brand') {
                return await db
                    .select({ id: brands.id, name: brands.name, imageUrl: brands.logoUrl })
                    .from(brands)
                    .where(sql`${brands.name} ILIKE ${search}`)
                    .limit(limit);
            } else if (input.entityType === 'manufacturer') {
                return await db
                    .select({ id: manufacturers.id, name: manufacturers.name, imageUrl: manufacturers.logoUrl })
                    .from(manufacturers)
                    .where(sql`${manufacturers.name} ILIKE ${search}`)
                    .limit(limit);
            } else if (input.entityType === 'pharmacy') {
                return await db
                    .select({ id: pharmacies.id, name: pharmacies.name, imageUrl: pharmacies.logoUrl })
                    .from(pharmacies)
                    .where(sql`${pharmacies.name} ILIKE ${search}`)
                    .limit(limit);
            } else if (input.entityType === 'cannabis_strain') {
                return await db
                    .select({ id: cannabisStrains.id, name: cannabisStrains.name, imageUrl: cannabisStrains.imageUrl })
                    .from(cannabisStrains)
                    .where(sql`${cannabisStrains.name} ILIKE ${search}`)
                    .limit(limit);
            }

            return [];
        }),
});
