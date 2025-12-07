import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import tycoonService from "../services/tycoonService";

/**
 * Dispensary Tycoon API Router
 * Mobile-first game endpoints
 */
export const tycoonRouter = router({
    // ============================================================================
    // DISPENSARY MANAGEMENT
    // ============================================================================

    /**
     * Get user's dispensary (or null if none exists)
     */
    getMyDispensary: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.user.id;
        const dispensary = await tycoonService.getDispensary(userId);

        if (!dispensary) {
            return { hasDispensary: false, dispensary: null };
        }

        // Get additional data
        const [inventory, staff, upgrades] = await Promise.all([
            tycoonService.getInventory(dispensary.id),
            tycoonService.getStaff(dispensary.id),
            tycoonService.getUpgrades(dispensary.id),
        ]);

        const rank = await tycoonService.getPlayerRank(dispensary.id);

        return {
            hasDispensary: true,
            dispensary,
            inventory,
            staff,
            upgrades,
            rank,
        };
    }),

    /**
     * Create a new dispensary
     */
    createDispensary: protectedProcedure
        .input(z.object({
            name: z.string().min(2).max(50),
        }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.user.id;
            return tycoonService.createDispensary(userId, input.name);
        }),

    /**
     * Collect accumulated idle earnings
     */
    collectIdleEarnings: protectedProcedure.mutation(async ({ ctx }) => {
        const dispensary = await tycoonService.getDispensary(ctx.user.id);
        if (!dispensary) {
            return { success: false, error: "No dispensary found" };
        }
        return tycoonService.collectIdleEarnings(dispensary.id);
    }),

    // ============================================================================
    // INVENTORY
    // ============================================================================

    /**
     * Get available strains to purchase
     */
    getAvailableStrains: protectedProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(50),
            offset: z.number().min(0).default(0),
        }).optional())
        .query(async ({ input }) => {
            const limit = input?.limit ?? 50;
            const offset = input?.offset ?? 0;
            return tycoonService.getAvailableStrains(limit, offset);
        }),

    /**
     * Purchase stock of a strain
     */
    purchaseStock: protectedProcedure
        .input(z.object({
            strainId: z.number(),
            quantity: z.number().min(1).max(1000),
        }))
        .mutation(async ({ ctx, input }) => {
            const dispensary = await tycoonService.getDispensary(ctx.user.id);
            if (!dispensary) {
                return { success: false, error: "No dispensary found" };
            }
            return tycoonService.purchaseStock(dispensary.id, input.strainId, input.quantity);
        }),

    /**
     * Update the sale price for a strain
     */
    updatePrice: protectedProcedure
        .input(z.object({
            strainId: z.number(),
            priceCents: z.number().min(100).max(10000000),
        }))
        .mutation(async ({ ctx, input }) => {
            const dispensary = await tycoonService.getDispensary(ctx.user.id);
            if (!dispensary) {
                return { success: false, error: "No dispensary found" };
            }
            return tycoonService.updatePrice(dispensary.id, input.strainId, input.priceCents);
        }),

    // ============================================================================
    // STAFF
    // ============================================================================

    /**
     * Hire a new staff member
     */
    hireStaff: protectedProcedure
        .input(z.object({
            role: z.enum(['budtender', 'grower', 'manager', 'security']),
            name: z.string().min(2).max(50),
        }))
        .mutation(async ({ ctx, input }) => {
            const dispensary = await tycoonService.getDispensary(ctx.user.id);
            if (!dispensary) {
                return { success: false, error: "No dispensary found" };
            }
            return tycoonService.hireStaff(dispensary.id, input.role, input.name);
        }),

    /**
     * Fire a staff member
     */
    fireStaff: protectedProcedure
        .input(z.object({
            staffId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const dispensary = await tycoonService.getDispensary(ctx.user.id);
            if (!dispensary) {
                return { success: false, error: "No dispensary found" };
            }
            return tycoonService.fireStaff(dispensary.id, input.staffId);
        }),

    // ============================================================================
    // UPGRADES
    // ============================================================================

    /**
     * Get upgrade costs and effects
     */
    getUpgradeInfo: publicProcedure.query(async () => {
        return {
            costs: tycoonService.UPGRADE_COSTS,
            effects: tycoonService.UPGRADE_EFFECTS,
        };
    }),

    /**
     * Purchase an upgrade
     */
    purchaseUpgrade: protectedProcedure
        .input(z.object({
            upgradeType: z.enum(['display_case', 'pos_system', 'waiting_area', 'grow_room', 'security_system']),
        }))
        .mutation(async ({ ctx, input }) => {
            const dispensary = await tycoonService.getDispensary(ctx.user.id);
            if (!dispensary) {
                return { success: false, error: "No dispensary found" };
            }
            return tycoonService.purchaseUpgrade(dispensary.id, input.upgradeType);
        }),

    // ============================================================================
    // LEADERBOARDS
    // ============================================================================

    /**
     * Get leaderboard
     */
    getLeaderboard: publicProcedure
        .input(z.object({
            boardType: z.enum(['revenue_all_time', 'revenue_daily', 'customers_all_time']).default('revenue_all_time'),
            limit: z.number().min(1).max(100).default(50),
        }).optional())
        .query(async ({ input }) => {
            const boardType = input?.boardType ?? 'revenue_all_time';
            const limit = input?.limit ?? 50;
            return tycoonService.getLeaderboard(boardType, limit);
        }),

    /**
     * Get my rank on a leaderboard
     */
    getMyRank: protectedProcedure
        .input(z.object({
            boardType: z.enum(['revenue_all_time', 'revenue_daily', 'customers_all_time']).default('revenue_all_time'),
        }).optional())
        .query(async ({ ctx, input }) => {
            const dispensary = await tycoonService.getDispensary(ctx.user.id);
            if (!dispensary) {
                return { rank: null };
            }
            const boardType = input?.boardType ?? 'revenue_all_time';
            const rank = await tycoonService.getPlayerRank(dispensary.id, boardType);
            return { rank };
        }),

    // ============================================================================
    // GAME SIMULATION (TEST ENDPOINT)
    // ============================================================================

    /**
     * Trigger sales simulation (for testing/demo)
     */
    simulateSales: protectedProcedure.mutation(async ({ ctx }) => {
        const dispensary = await tycoonService.getDispensary(ctx.user.id);
        if (!dispensary) {
            return { success: false, error: "No dispensary found" };
        }
        const result = await tycoonService.simulateSales(dispensary.id);
        return { success: true, ...result };
    }),
});

export type TycoonRouter = typeof tycoonRouter;
