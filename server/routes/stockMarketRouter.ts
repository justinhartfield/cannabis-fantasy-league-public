/**
 * Stock Market Trading Router
 * 
 * API endpoints for the Cannabis Stock Market
 */

import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import { getDb } from '../db';
import {
    userPortfolios,
    stockHoldings,
    tradeHistory,
    stockPrices,
    marketLeaderboard
} from '../../drizzle/stockMarketSchema';
import { strains, cannabisStrains, manufacturers } from '../../drizzle/schema';
import { strainDailyChallengeStats } from '../../drizzle/dailyChallengeSchema';
import { eq, and, desc, sql, gte, asc } from 'drizzle-orm';
import { getCurrentPrice, calculateProductPrices, savePrices } from '../stockPricingEngine';
import { TRPCError } from '@trpc/server';

const BASE_PRICE = 10.00;

export const stockMarketRouter = router({
    /**
     * Get or create user portfolio
     */
    getPortfolio: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

        // Get or create portfolio
        let [portfolio] = await db
            .select()
            .from(userPortfolios)
            .where(eq(userPortfolios.userId, ctx.user.id))
            .limit(1);

        if (!portfolio) {
            // Create new portfolio with €100k
            [portfolio] = await db
                .insert(userPortfolios)
                .values({
                    userId: ctx.user.id,
                    cashBalance: '100000',
                    totalValue: '100000',
                })
                .returning();
        }

        // Get holdings
        const holdings = await db
            .select()
            .from(stockHoldings)
            .where(eq(stockHoldings.userId, ctx.user.id));

        // Calculate current value of holdings
        let holdingsValue = 0;
        const holdingsWithPrices = await Promise.all(holdings.map(async (h) => {
            const currentPrice = await getCurrentPrice(h.assetType, h.assetId);
            const shares = Number(h.shares);
            const avgPrice = Number(h.avgBuyPrice);
            const currentValue = shares * currentPrice;
            const profitLoss = currentValue - (shares * avgPrice);

            holdingsValue += currentValue;

            // Get asset name
            let assetName = '';
            if (h.assetType === 'product' || h.assetType === 'strain') {
                const [strain] = await db
                    .select({ name: cannabisStrains.name })
                    .from(cannabisStrains)
                    .where(eq(cannabisStrains.id, h.assetId))
                    .limit(1);
                assetName = strain?.name || `Asset #${h.assetId}`;
            } else if (h.assetType === 'manufacturer') {
                const [mfg] = await db
                    .select({ name: manufacturers.name })
                    .from(manufacturers)
                    .where(eq(manufacturers.id, h.assetId))
                    .limit(1);
                assetName = mfg?.name || `Manufacturer #${h.assetId}`;
            }

            return {
                ...h,
                shares,
                avgBuyPrice: avgPrice,
                currentPrice,
                currentValue,
                profitLoss,
                profitLossPercent: avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0,
                assetName,
            };
        }));

        const totalValue = Number(portfolio.cashBalance) + holdingsValue;

        return {
            cashBalance: Number(portfolio.cashBalance),
            holdingsValue,
            totalValue,
            totalProfitLoss: totalValue - 100000, // P/L from starting capital
            holdings: holdingsWithPrices,
        };
    }),

    /**
     * Buy shares of an asset
     */
    buy: protectedProcedure
        .input(z.object({
            assetType: z.enum(['product', 'strain', 'manufacturer']),
            assetId: z.number(),
            shares: z.number().positive(),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

            const currentPrice = await getCurrentPrice(input.assetType, input.assetId);
            const totalCost = input.shares * currentPrice;

            // Get portfolio
            let [portfolio] = await db
                .select()
                .from(userPortfolios)
                .where(eq(userPortfolios.userId, ctx.user.id))
                .limit(1);

            if (!portfolio) {
                [portfolio] = await db
                    .insert(userPortfolios)
                    .values({ userId: ctx.user.id })
                    .returning();
            }

            const cashBalance = Number(portfolio.cashBalance);

            // Allow margin (going negative)
            const newCashBalance = cashBalance - totalCost;

            // Update portfolio cash
            await db
                .update(userPortfolios)
                .set({
                    cashBalance: String(newCashBalance),
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(userPortfolios.userId, ctx.user.id));

            // Update or create holding
            const [existingHolding] = await db
                .select()
                .from(stockHoldings)
                .where(and(
                    eq(stockHoldings.userId, ctx.user.id),
                    eq(stockHoldings.assetType, input.assetType),
                    eq(stockHoldings.assetId, input.assetId),
                    eq(stockHoldings.isShort, false)
                ))
                .limit(1);

            if (existingHolding) {
                // Average up the position
                const existingShares = Number(existingHolding.shares);
                const existingAvg = Number(existingHolding.avgBuyPrice);
                const newTotalShares = existingShares + input.shares;
                const newAvgPrice = ((existingShares * existingAvg) + (input.shares * currentPrice)) / newTotalShares;

                await db
                    .update(stockHoldings)
                    .set({
                        shares: String(newTotalShares),
                        avgBuyPrice: String(newAvgPrice),
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(stockHoldings.id, existingHolding.id));
            } else {
                await db
                    .insert(stockHoldings)
                    .values({
                        userId: ctx.user.id,
                        assetType: input.assetType,
                        assetId: input.assetId,
                        shares: String(input.shares),
                        avgBuyPrice: String(currentPrice),
                        isShort: false,
                    });
            }

            // Get asset name for trade history
            let assetName = '';
            if (input.assetType === 'product' || input.assetType === 'strain') {
                const [strain] = await db
                    .select({ name: cannabisStrains.name })
                    .from(cannabisStrains)
                    .where(eq(cannabisStrains.id, input.assetId))
                    .limit(1);
                assetName = strain?.name || '';
            }

            // Record trade
            await db
                .insert(tradeHistory)
                .values({
                    userId: ctx.user.id,
                    assetType: input.assetType,
                    assetId: input.assetId,
                    assetName,
                    action: 'buy',
                    shares: String(input.shares),
                    pricePerShare: String(currentPrice),
                    totalValue: String(totalCost),
                });

            return {
                success: true,
                message: `Bought ${input.shares} shares at €${currentPrice.toFixed(2)}`,
                totalCost,
                newCashBalance,
            };
        }),

    /**
     * Sell shares of an asset
     */
    sell: protectedProcedure
        .input(z.object({
            assetType: z.enum(['product', 'strain', 'manufacturer']),
            assetId: z.number(),
            shares: z.number().positive(),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

            // Get existing holding
            const [holding] = await db
                .select()
                .from(stockHoldings)
                .where(and(
                    eq(stockHoldings.userId, ctx.user.id),
                    eq(stockHoldings.assetType, input.assetType),
                    eq(stockHoldings.assetId, input.assetId),
                    eq(stockHoldings.isShort, false)
                ))
                .limit(1);

            if (!holding) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'You do not own this asset' });
            }

            const ownedShares = Number(holding.shares);
            if (input.shares > ownedShares) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: `You only own ${ownedShares} shares` });
            }

            const currentPrice = await getCurrentPrice(input.assetType, input.assetId);
            const totalValue = input.shares * currentPrice;
            const avgBuyPrice = Number(holding.avgBuyPrice);
            const profitLoss = (currentPrice - avgBuyPrice) * input.shares;

            // Update portfolio cash
            const [portfolio] = await db
                .select()
                .from(userPortfolios)
                .where(eq(userPortfolios.userId, ctx.user.id))
                .limit(1);

            const newCashBalance = Number(portfolio.cashBalance) + totalValue;
            const newProfitLoss = Number(portfolio.totalProfitLoss) + profitLoss;

            await db
                .update(userPortfolios)
                .set({
                    cashBalance: String(newCashBalance),
                    totalProfitLoss: String(newProfitLoss),
                    winCount: profitLoss > 0 ? sql`${userPortfolios.winCount} + 1` : userPortfolios.winCount,
                    lossCount: profitLoss < 0 ? sql`${userPortfolios.lossCount} + 1` : userPortfolios.lossCount,
                    updatedAt: new Date().toISOString(),
                })
                .where(eq(userPortfolios.userId, ctx.user.id));

            // Update holding
            const remainingShares = ownedShares - input.shares;
            if (remainingShares <= 0) {
                await db
                    .delete(stockHoldings)
                    .where(eq(stockHoldings.id, holding.id));
            } else {
                await db
                    .update(stockHoldings)
                    .set({
                        shares: String(remainingShares),
                        updatedAt: new Date().toISOString(),
                    })
                    .where(eq(stockHoldings.id, holding.id));
            }

            // Record trade
            await db
                .insert(tradeHistory)
                .values({
                    userId: ctx.user.id,
                    assetType: input.assetType,
                    assetId: input.assetId,
                    action: 'sell',
                    shares: String(input.shares),
                    pricePerShare: String(currentPrice),
                    totalValue: String(totalValue),
                    profitLoss: String(profitLoss),
                });

            return {
                success: true,
                message: `Sold ${input.shares} shares at €${currentPrice.toFixed(2)}`,
                totalValue,
                profitLoss,
                newCashBalance,
            };
        }),

    /**
     * Get all available stocks with current prices
     * Pulls directly from strainDailyChallengeStats and cannabisStrains
     */
    getStocks: publicProcedure
        .input(z.object({
            assetType: z.enum(['product', 'strain', 'manufacturer']).optional(),
            limit: z.number().default(50),
            sortBy: z.enum(['price', 'change', 'volume']).default('volume'),
        }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) return [];

            // Import daily challenge stats
            const { strainDailyChallengeStats, manufacturerDailyChallengeStats } =
                await import('../../drizzle/dailyChallengeSchema');

            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const stocks: Array<{
                assetType: string;
                assetId: number;
                assetName: string;
                imageUrl: string | null;
                closePrice: number;
                priceChange: number;
                priceChangePercent: number;
                volume: number;
            }> = [];

            // Get strain stocks (these are the main tradeable assets)
            if (!input.assetType || input.assetType === 'strain' || input.assetType === 'product') {
                // Get today's stats
                const todayStats = await db
                    .select({
                        strainId: strainDailyChallengeStats.strainId,
                        orderCount: strainDailyChallengeStats.orderCount,
                        totalPoints: strainDailyChallengeStats.totalPoints,
                        strainName: cannabisStrains.name,
                        imageUrl: cannabisStrains.imageUrl,
                    })
                    .from(strainDailyChallengeStats)
                    .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
                    .where(eq(strainDailyChallengeStats.statDate, today))
                    .orderBy(desc(strainDailyChallengeStats.orderCount))
                    .limit(input.limit);

                // If no today data, try yesterday
                const statsToUse = todayStats.length > 0 ? todayStats : await db
                    .select({
                        strainId: strainDailyChallengeStats.strainId,
                        orderCount: strainDailyChallengeStats.orderCount,
                        totalPoints: strainDailyChallengeStats.totalPoints,
                        strainName: cannabisStrains.name,
                        imageUrl: cannabisStrains.imageUrl,
                    })
                    .from(strainDailyChallengeStats)
                    .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
                    .where(eq(strainDailyChallengeStats.statDate, yesterdayStr))
                    .orderBy(desc(strainDailyChallengeStats.orderCount))
                    .limit(input.limit);

                for (const stat of statsToUse) {
                    // Calculate price based on order volume
                    // Base price €10, scales with order volume
                    const basePrice = 10;
                    const orderMultiplier = Math.max(0.5, Math.min(5, (stat.orderCount || 0) / 50));
                    const price = Math.round(basePrice * orderMultiplier * 100) / 100;

                    // Random price change for demo (in production, compare to yesterday)
                    const priceChange = Math.round((Math.random() * 4 - 2) * 100) / 100;
                    const priceChangePercent = Math.round((priceChange / price) * 10000) / 100;

                    stocks.push({
                        assetType: 'strain',
                        assetId: stat.strainId,
                        assetName: stat.strainName || `Strain #${stat.strainId}`,
                        imageUrl: stat.imageUrl,
                        closePrice: price,
                        priceChange,
                        priceChangePercent,
                        volume: stat.orderCount || 0,
                    });
                }
            }

            // Get manufacturer stocks (hedge funds)
            if (!input.assetType || input.assetType === 'manufacturer') {
                const mfgStats = await db
                    .select({
                        mfgId: manufacturerDailyChallengeStats.manufacturerId,
                        orderCount: manufacturerDailyChallengeStats.orderCount,
                        totalPoints: manufacturerDailyChallengeStats.totalPoints,
                        mfgName: manufacturers.name,
                        imageUrl: manufacturers.logoUrl,
                    })
                    .from(manufacturerDailyChallengeStats)
                    .innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id))
                    .where(eq(manufacturerDailyChallengeStats.statDate, today))
                    .orderBy(desc(manufacturerDailyChallengeStats.orderCount))
                    .limit(input.limit);

                // If no today data, try yesterday
                const mfgStatsToUse = mfgStats.length > 0 ? mfgStats : await db
                    .select({
                        mfgId: manufacturerDailyChallengeStats.manufacturerId,
                        orderCount: manufacturerDailyChallengeStats.orderCount,
                        totalPoints: manufacturerDailyChallengeStats.totalPoints,
                        mfgName: manufacturers.name,
                        imageUrl: manufacturers.logoUrl,
                    })
                    .from(manufacturerDailyChallengeStats)
                    .innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id))
                    .where(eq(manufacturerDailyChallengeStats.statDate, yesterdayStr))
                    .orderBy(desc(manufacturerDailyChallengeStats.orderCount))
                    .limit(input.limit);

                for (const stat of mfgStatsToUse) {
                    const basePrice = 25; // Hedge funds are more expensive
                    const orderMultiplier = Math.max(0.5, Math.min(5, (stat.orderCount || 0) / 200));
                    const price = Math.round(basePrice * orderMultiplier * 100) / 100;

                    const priceChange = Math.round((Math.random() * 6 - 3) * 100) / 100;
                    const priceChangePercent = Math.round((priceChange / price) * 10000) / 100;

                    stocks.push({
                        assetType: 'manufacturer',
                        assetId: stat.mfgId,
                        assetName: stat.mfgName || `Manufacturer #${stat.mfgId}`,
                        imageUrl: stat.imageUrl,
                        closePrice: price,
                        priceChange,
                        priceChangePercent,
                        volume: stat.orderCount || 0,
                    });
                }
            }

            // Sort based on input
            if (input.sortBy === 'price') {
                stocks.sort((a, b) => b.closePrice - a.closePrice);
            } else if (input.sortBy === 'change') {
                stocks.sort((a, b) => b.priceChangePercent - a.priceChangePercent);
            } else {
                stocks.sort((a, b) => b.volume - a.volume);
            }

            return stocks.slice(0, input.limit);
        }),

    /**
     * Get leaderboard
     */
    getLeaderboard: publicProcedure
        .input(z.object({
            period: z.enum(['daily', 'weekly', 'alltime']).default('alltime'),
            limit: z.number().default(20),
        }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) return [];

            // For alltime, just get top portfolios by total value
            const portfolios = await db
                .select({
                    userId: userPortfolios.userId,
                    totalValue: userPortfolios.totalValue,
                    totalProfitLoss: userPortfolios.totalProfitLoss,
                    winCount: userPortfolios.winCount,
                    lossCount: userPortfolios.lossCount,
                })
                .from(userPortfolios)
                .orderBy(desc(userPortfolios.totalValue))
                .limit(input.limit);

            return portfolios.map((p, i) => ({
                rank: i + 1,
                userId: p.userId,
                totalValue: Number(p.totalValue),
                profitLoss: Number(p.totalProfitLoss),
                profitLossPercent: ((Number(p.totalProfitLoss)) / 100000) * 100,
                winRate: p.winCount + p.lossCount > 0
                    ? (p.winCount / (p.winCount + p.lossCount)) * 100
                    : 0,
            }));
        }),

    /**
     * Get trade history
     */
    getTradeHistory: protectedProcedure
        .input(z.object({
            limit: z.number().default(50),
        }))
        .query(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return [];

            const trades = await db
                .select()
                .from(tradeHistory)
                .where(eq(tradeHistory.userId, ctx.user.id))
                .orderBy(desc(tradeHistory.executedAt))
                .limit(input.limit);

            return trades.map(t => ({
                ...t,
                shares: Number(t.shares),
                pricePerShare: Number(t.pricePerShare),
                totalValue: Number(t.totalValue),
                profitLoss: t.profitLoss ? Number(t.profitLoss) : null,
            }));
        }),

    /**
     * Calculate and update prices (admin/cron)
     */
    updatePrices: protectedProcedure.mutation(async ({ ctx }) => {
        const { updateDailyPrices } = await import('../stockMarketCron');
        const count = await updateDailyPrices();

        return {
            success: true,
            message: `Updated ${count} prices`,
        };
    }),

    /**
     * Get price history for charts
     */
    getPriceHistory: publicProcedure
        .input(z.object({
            assetType: z.enum(['product', 'strain', 'manufacturer']),
            assetId: z.number(),
            days: z.number().default(30),
        }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) return [];

            const startDate = new Date();
            startDate.setDate(startDate.getDate() - input.days);
            const startDateStr = startDate.toISOString().split('T')[0];

            const history = await db
                .select()
                .from(stockPrices)
                .where(and(
                    eq(stockPrices.assetType, input.assetType),
                    eq(stockPrices.assetId, input.assetId),
                    gte(stockPrices.priceDate, startDateStr)
                ))
                .orderBy(stockPrices.priceDate);

            return history.map(h => ({
                date: h.priceDate,
                open: Number(h.openPrice),
                close: Number(h.closePrice),
                high: Number(h.highPrice),
                low: Number(h.lowPrice),
                volume: h.volume,
                change: Number(h.priceChange),
                changePercent: Number(h.priceChangePercent),
            }));
        }),

    /**
     * Get weekly competition winners
     */
    getWeeklyWinners: publicProcedure
        .input(z.object({
            limit: z.number().default(5),
        }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) return [];

            // Get recent weekly achievements
            const winners = await db
                .select()
                .from(marketAchievements)
                .where(sql`${marketAchievements.achievementType} LIKE 'weekly_%'`)
                .orderBy(desc(marketAchievements.earnedAt))
                .limit(input.limit * 3); // Get last few weeks

            return winners.map(w => ({
                userId: w.userId,
                achievement: w.achievementName,
                description: w.description,
                earnedAt: w.earnedAt,
            }));
        }),

    /**
     * Get current week standings
     */
    getWeeklyStandings: publicProcedure
        .input(z.object({
            limit: z.number().default(10),
        }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) return [];

            // Get portfolios sorted by P/L
            const standings = await db
                .select({
                    userId: userPortfolios.userId,
                    totalValue: userPortfolios.totalValue,
                    profitLoss: userPortfolios.totalProfitLoss,
                    winCount: userPortfolios.winCount,
                    lossCount: userPortfolios.lossCount,
                })
                .from(userPortfolios)
                .orderBy(desc(userPortfolios.totalProfitLoss))
                .limit(input.limit);

            // Calculate days until Sunday
            const now = new Date();
            const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
            const endDate = new Date(now);
            endDate.setDate(now.getDate() + daysUntilSunday);
            endDate.setHours(0, 0, 0, 0);

            return {
                standings: standings.map((s, i) => ({
                    rank: i + 1,
                    userId: s.userId,
                    totalValue: Number(s.totalValue),
                    profitLoss: Number(s.profitLoss),
                    profitLossPercent: (Number(s.profitLoss) / 100000) * 100,
                    trades: s.winCount + s.lossCount,
                    winRate: s.winCount + s.lossCount > 0
                        ? (s.winCount / (s.winCount + s.lossCount)) * 100
                        : 0,
                })),
                prizes: [
                    { place: 1, points: 1000, emoji: '🏆' },
                    { place: 2, points: 500, emoji: '🥈' },
                    { place: 3, points: 250, emoji: '🥉' },
                ],
                endsAt: endDate.toISOString(),
                daysRemaining: daysUntilSunday,
            };
        }),

    /**
     * Get detailed strain information with historical data
     * Bloomberg Terminal style view
     */
    getStrainDetail: publicProcedure
        .input(z.object({
            strainId: z.number(),
        }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

            // Get strain info
            const [strain] = await db
                .select()
                .from(cannabisStrains)
                .where(eq(cannabisStrains.id, input.strainId))
                .limit(1);

            if (!strain) {
                throw new TRPCError({ code: 'NOT_FOUND', message: 'Strain not found' });
            }

            // Get 30 days of historical stats
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

            const history = await db
                .select()
                .from(strainDailyChallengeStats)
                .where(and(
                    eq(strainDailyChallengeStats.strainId, input.strainId),
                    gte(strainDailyChallengeStats.statDate, startDateStr)
                ))
                .orderBy(asc(strainDailyChallengeStats.statDate));

            // Get latest stats for current values
            const [latestStats] = await db
                .select()
                .from(strainDailyChallengeStats)
                .where(eq(strainDailyChallengeStats.strainId, input.strainId))
                .orderBy(desc(strainDailyChallengeStats.statDate))
                .limit(1);

            // Calculate current price from order count
            const BASE_PRICE = 5.00;
            const currentPrice = latestStats
                ? BASE_PRICE + (latestStats.orderCount * 0.1)
                : BASE_PRICE;

            // Get yesterday's price for daily change
            const yesterdayStats = history.length > 1 ? history[history.length - 2] : null;
            const yesterdayPrice = yesterdayStats
                ? BASE_PRICE + (yesterdayStats.orderCount * 0.1)
                : currentPrice;
            const priceChange = currentPrice - yesterdayPrice;
            const priceChangePercent = yesterdayPrice > 0
                ? ((currentPrice - yesterdayPrice) / yesterdayPrice) * 100
                : 0;

            // Parse JSON fields safely
            const parseJsonField = (field: string | null | undefined): string[] => {
                if (!field) return [];
                try {
                    const parsed = JSON.parse(field);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return field.split(',').map(s => s.trim()).filter(Boolean);
                }
            };

            // Calculate 7-day and 30-day performance
            const last7Days = history.slice(-7);
            const last30Days = history;

            const avg7DayOrders = last7Days.length > 0
                ? last7Days.reduce((sum, d) => sum + d.orderCount, 0) / last7Days.length
                : 0;
            const avg30DayOrders = last30Days.length > 0
                ? last30Days.reduce((sum, d) => sum + d.orderCount, 0) / last30Days.length
                : 0;

            const totalVolume = last30Days.reduce((sum, d) => sum + d.salesVolumeGrams, 0);

            return {
                // Basic Info
                id: strain.id,
                name: strain.name,
                slug: strain.slug,
                type: strain.type || 'Hybrid',
                description: strain.description,
                imageUrl: (strain as any).imageUrl || null,

                // THC/CBD
                thcMin: strain.thcMin,
                thcMax: strain.thcMax,
                cbdMin: strain.cbdMin,
                cbdMax: strain.cbdMax,

                // Parsed arrays
                effects: parseJsonField(strain.effects),
                flavors: parseJsonField(strain.flavors),
                terpenes: parseJsonField(strain.terpenes),

                // Current Price
                currentPrice,
                priceChange,
                priceChangePercent,

                // Latest Stats
                todayOrders: latestStats?.orderCount || 0,
                todayVolume: latestStats?.salesVolumeGrams || 0,
                currentRank: latestStats?.rank || 0,
                previousRank: latestStats?.previousRank || 0,
                streakDays: latestStats?.streakDays || 0,
                trendMultiplier: latestStats?.trendMultiplier ? Number(latestStats.trendMultiplier) : 1.0,
                consistencyScore: latestStats?.consistencyScore || 0,
                velocityScore: latestStats?.velocityScore || 0,
                marketShare: latestStats?.marketSharePercent ? Number(latestStats.marketSharePercent) : 0,

                // Performance Stats
                avg7DayOrders: Math.round(avg7DayOrders),
                avg30DayOrders: Math.round(avg30DayOrders),
                totalVolume30Days: totalVolume,

                // Historical Data for Charts
                priceHistory: history.map(h => ({
                    date: h.statDate,
                    price: BASE_PRICE + (h.orderCount * 0.1),
                    orders: h.orderCount,
                    volume: h.salesVolumeGrams,
                    rank: h.rank,
                })),
            };
        }),
});
