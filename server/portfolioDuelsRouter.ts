/**
 * Portfolio Duels Router
 * 
 * tRPC API endpoints for 1v1 multiplayer draft battles
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getPortfolioDuelsService } from "./services/portfolioDuelsService";
import { DuelPosition, DuelType } from "../drizzle/portfolioDuelsSchema";

export const portfolioDuelsRouter = router({
    /**
     * Join matchmaking queue for quick match
     */
    joinQueue: protectedProcedure
        .input(z.object({
            anteAmount: z.number().min(50).max(500),
            duelType: z.enum(['sprint']).default('sprint'),
        }))
        .mutation(async ({ ctx, input }) => {
            const service = getPortfolioDuelsService();
            return service.joinQueue(ctx.user.id, input.anteAmount, input.duelType as DuelType);
        }),

    /**
     * Leave matchmaking queue
     */
    leaveQueue: protectedProcedure
        .mutation(async ({ ctx }) => {
            const service = getPortfolioDuelsService();
            return service.leaveQueue(ctx.user.id);
        }),

    /**
     * Send duel invite to a friend
     */
    sendInvite: protectedProcedure
        .input(z.object({
            receiverId: z.number(),
            anteAmount: z.number().min(50).max(500),
            duelType: z.enum(['sprint']).default('sprint'),
        }))
        .mutation(async ({ ctx, input }) => {
            const service = getPortfolioDuelsService();
            return service.sendInvite(ctx.user.id, input.receiverId, input.anteAmount, input.duelType as DuelType);
        }),

    /**
     * Accept a duel invite
     */
    acceptInvite: protectedProcedure
        .input(z.object({
            inviteId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const service = getPortfolioDuelsService();
            return service.acceptInvite(input.inviteId, ctx.user.id);
        }),

    /**
     * Decline a duel invite
     */
    declineInvite: protectedProcedure
        .input(z.object({
            inviteId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { getDb } = await import("./db");
            const { eq, and } = await import("drizzle-orm");
            const { portfolioDuelInvites } = await import("../drizzle/portfolioDuelsSchema");

            const db = await getDb();
            if (!db) throw new Error("Database not available");

            await db.update(portfolioDuelInvites)
                .set({ status: 'declined' })
                .where(and(
                    eq(portfolioDuelInvites.id, input.inviteId),
                    eq(portfolioDuelInvites.receiverId, ctx.user.id)
                ));

            return { success: true };
        }),

    /**
     * Make a pick during draft
     */
    makePick: protectedProcedure
        .input(z.object({
            duelId: z.number(),
            position: z.enum(['STRAIN_1', 'STRAIN_2', 'MANUFACTURER', 'PRODUCT', 'PHARMACY']),
            assetType: z.enum(['strain', 'manufacturer', 'product', 'pharmacy']),
            assetId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const service = getPortfolioDuelsService();
            return service.makePick({
                duelId: input.duelId,
                userId: ctx.user.id,
                position: input.position as DuelPosition,
                assetType: input.assetType,
                assetId: input.assetId,
            });
        }),

    /**
     * Get duel by ID with all picks
     */
    getDuelById: protectedProcedure
        .input(z.object({
            duelId: z.number(),
        }))
        .query(async ({ input }) => {
            const service = getPortfolioDuelsService();
            return service.getDuelById(input.duelId);
        }),

    /**
     * Get user's active duels
     */
    getActiveDuels: protectedProcedure
        .query(async ({ ctx }) => {
            const service = getPortfolioDuelsService();
            return service.getActiveDuels(ctx.user.id);
        }),

    /**
     * Get pending invites for user
     */
    getPendingInvites: protectedProcedure
        .query(async ({ ctx }) => {
            const service = getPortfolioDuelsService();
            return service.getPendingInvites(ctx.user.id);
        }),

    /**
     * Get user's duel history
     */
    getDuelHistory: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(50).default(20),
        }))
        .query(async ({ ctx, input }) => {
            const { getDb } = await import("./db");
            const { eq, or, desc } = await import("drizzle-orm");
            const { portfolioDuels } = await import("../drizzle/portfolioDuelsSchema");

            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const duels = await db
                .select()
                .from(portfolioDuels)
                .where(or(
                    eq(portfolioDuels.creatorId, ctx.user.id),
                    eq(portfolioDuels.opponentId, ctx.user.id)
                ))
                .orderBy(desc(portfolioDuels.createdAt))
                .limit(input.limit);

            return duels;
        }),

    /**
     * Get duel leaderboard
     */
    getLeaderboard: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(50).default(20),
        }))
        .query(async ({ input }) => {
            const service = getPortfolioDuelsService();
            return service.getLeaderboard(input.limit);
        }),

    /**
     * Get available assets for drafting (with taken filter)
     */
    getAvailableAssets: protectedProcedure
        .input(z.object({
            duelId: z.number(),
            assetType: z.enum(['strain', 'manufacturer', 'product', 'pharmacy']),
        }))
        .query(async ({ input }) => {
            const { getDb } = await import("./db");
            const { eq, notInArray, desc } = await import("drizzle-orm");
            const { portfolioDuelPicks } = await import("../drizzle/portfolioDuelsSchema");
            const { cannabisStrains, manufacturers, strains, pharmacies } = await import("../drizzle/schema");
            const {
                strainDailyChallengeStats,
                manufacturerDailyChallengeStats,
                productDailyChallengeStats,
                pharmacyDailyChallengeStats
            } = await import("../drizzle/dailyChallengeSchema");

            const db = await getDb();
            if (!db) throw new Error("Database not available");

            // Get already picked assets in this duel
            const pickedAssets = await db
                .select({ assetId: portfolioDuelPicks.assetId })
                .from(portfolioDuelPicks)
                .where(eq(portfolioDuelPicks.duelId, input.duelId));

            const pickedIds = pickedAssets.map(p => p.assetId);
            const today = new Date().toISOString().split('T')[0];

            switch (input.assetType) {
                case 'strain':
                    return db
                        .select({
                            id: cannabisStrains.id,
                            name: cannabisStrains.name,
                            totalPoints: strainDailyChallengeStats.totalPoints,
                            orderCount: strainDailyChallengeStats.orderCount,
                        })
                        .from(cannabisStrains)
                        .leftJoin(strainDailyChallengeStats, eq(cannabisStrains.id, strainDailyChallengeStats.strainId))
                        .where(pickedIds.length > 0 ? notInArray(cannabisStrains.id, pickedIds) : undefined)
                        .orderBy(desc(strainDailyChallengeStats.totalPoints))
                        .limit(50);

                case 'manufacturer':
                    return db
                        .select({
                            id: manufacturers.id,
                            name: manufacturers.name,
                            totalPoints: manufacturerDailyChallengeStats.totalPoints,
                            orderCount: manufacturerDailyChallengeStats.orderCount,
                        })
                        .from(manufacturers)
                        .leftJoin(manufacturerDailyChallengeStats, eq(manufacturers.id, manufacturerDailyChallengeStats.manufacturerId))
                        .where(pickedIds.length > 0 ? notInArray(manufacturers.id, pickedIds) : undefined)
                        .orderBy(desc(manufacturerDailyChallengeStats.totalPoints))
                        .limit(50);

                case 'product':
                    return db
                        .select({
                            id: strains.id,
                            name: strains.name,
                            totalPoints: productDailyChallengeStats.totalPoints,
                            orderCount: productDailyChallengeStats.orderCount,
                        })
                        .from(strains)
                        .leftJoin(productDailyChallengeStats, eq(strains.id, productDailyChallengeStats.productId))
                        .where(pickedIds.length > 0 ? notInArray(strains.id, pickedIds) : undefined)
                        .orderBy(desc(productDailyChallengeStats.totalPoints))
                        .limit(50);

                case 'pharmacy':
                    return db
                        .select({
                            id: pharmacies.id,
                            name: pharmacies.name,
                            totalPoints: pharmacyDailyChallengeStats.totalPoints,
                            orderCount: pharmacyDailyChallengeStats.orderCount,
                        })
                        .from(pharmacies)
                        .leftJoin(pharmacyDailyChallengeStats, eq(pharmacies.id, pharmacyDailyChallengeStats.pharmacyId))
                        .where(pickedIds.length > 0 ? notInArray(pharmacies.id, pickedIds) : undefined)
                        .orderBy(desc(pharmacyDailyChallengeStats.totalPoints))
                        .limit(50);
            }
        }),

    /**
     * Get user's duel stats
     */
    getMyStats: protectedProcedure
        .query(async ({ ctx }) => {
            const { getDb } = await import("./db");
            const { eq } = await import("drizzle-orm");
            const { portfolioDuelStats } = await import("../drizzle/portfolioDuelsSchema");

            const db = await getDb();
            if (!db) throw new Error("Database not available");

            const [stats] = await db
                .select()
                .from(portfolioDuelStats)
                .where(eq(portfolioDuelStats.userId, ctx.user.id))
                .limit(1);

            return stats || {
                totalDuels: 0,
                wins: 0,
                losses: 0,
                draws: 0,
                netPoints: 0,
                currentWinStreak: 0,
            };
        }),
});
