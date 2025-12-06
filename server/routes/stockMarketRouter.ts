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
    marketLeaderboard,
    stockWatchlist,
    priceAlerts
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
            // Create new portfolio with 100 pts starting balance
            [portfolio] = await db
                .insert(userPortfolios)
                .values({
                    userId: ctx.user.id,
                    cashBalance: '100',
                    totalValue: '100',
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
            totalProfitLoss: totalValue - 100, // P/L from starting capital
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

            // Strict balance check - no negative balances allowed
            if (totalCost > cashBalance) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Insufficient balance. You have ${Math.round(cashBalance)} pts but need ${Math.round(totalCost)} pts.`
                });
            }

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
                message: `Bought ${input.shares} shares at ${Math.round(currentPrice)} pts`,
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
                message: `Sold ${input.shares} shares at ${Math.round(currentPrice)} pts (${profitLoss >= 0 ? '+' : ''}${Math.round(profitLoss)} pts)`,
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
                // Get today's stats with ALL scoring factors
                const todayStats = await db
                    .select({
                        strainId: strainDailyChallengeStats.strainId,
                        orderCount: strainDailyChallengeStats.orderCount,
                        totalPoints: strainDailyChallengeStats.totalPoints,
                        rank: strainDailyChallengeStats.rank,
                        previousRank: strainDailyChallengeStats.previousRank,
                        trendMultiplier: strainDailyChallengeStats.trendMultiplier,
                        consistencyScore: strainDailyChallengeStats.consistencyScore,
                        streakDays: strainDailyChallengeStats.streakDays,
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
                        rank: strainDailyChallengeStats.rank,
                        previousRank: strainDailyChallengeStats.previousRank,
                        trendMultiplier: strainDailyChallengeStats.trendMultiplier,
                        consistencyScore: strainDailyChallengeStats.consistencyScore,
                        streakDays: strainDailyChallengeStats.streakDays,
                        strainName: cannabisStrains.name,
                        imageUrl: cannabisStrains.imageUrl,
                    })
                    .from(strainDailyChallengeStats)
                    .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
                    .where(eq(strainDailyChallengeStats.statDate, yesterdayStr))
                    .orderBy(desc(strainDailyChallengeStats.orderCount))
                    .limit(input.limit);

                // Get actual total strain count for consistent rank bonus calculation
                const dateForCount = todayStats.length > 0 ? today : yesterdayStr;
                const [countResult] = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(strainDailyChallengeStats)
                    .where(eq(strainDailyChallengeStats.statDate, dateForCount));
                const totalStrains = Number(countResult?.count) || 50;

                for (const stat of statsToUse) {
                    // DYNAMIC SCORE CALCULATION
                    // Score factors that create relative dynamics:
                    const orderScore = (stat.orderCount || 0) * 10;                    // More orders = higher score
                    const rankBonus = (totalStrains - (stat.rank || totalStrains)) * 5; // Higher rank = bonus (zero-sum!)
                    const trendMultiplier = Number(stat.trendMultiplier || 1);
                    const momentumBonus = Math.round((trendMultiplier - 1) * 50);      // Momentum adds/subtracts
                    const consistencyBonus = Math.round((stat.consistencyScore || 0) / 5);
                    const streakBonus = Math.min(stat.streakDays || 0, 14) * 2;        // Max 28 pts from streak

                    const score = Math.max(10, orderScore + rankBonus + momentumBonus + consistencyBonus + streakBonus);

                    // Calculate score change from rank movement
                    // If rank improved (lower number), score went up; if rank dropped, score went down
                    const rankChange = (stat.previousRank || stat.rank || 0) - (stat.rank || 0);
                    const scoreChange = rankChange * 5 + momentumBonus;
                    const scoreChangePercent = score > 0 ? (scoreChange / score) * 100 : 0;

                    stocks.push({
                        assetType: 'strain',
                        assetId: stat.strainId,
                        assetName: stat.strainName || `Strain #${stat.strainId}`,
                        imageUrl: stat.imageUrl,
                        closePrice: score, // Now represents SCORE, not price
                        priceChange: scoreChange,
                        priceChangePercent: Math.round(scoreChangePercent * 10) / 10,
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

            // Get all portfolios with their holdings
            const portfolios = await db
                .select({
                    userId: userPortfolios.userId,
                    cashBalance: userPortfolios.cashBalance,
                    winCount: userPortfolios.winCount,
                    lossCount: userPortfolios.lossCount,
                })
                .from(userPortfolios)
                .limit(100); // Get more than limit to sort after

            // Calculate dynamic values for each portfolio
            const portfolioValues = await Promise.all(portfolios.map(async (p) => {
                // Get holdings for this user
                const holdings = await db
                    .select()
                    .from(stockHoldings)
                    .where(eq(stockHoldings.userId, p.userId));

                // Calculate current holdings value using dynamic scores
                let holdingsValue = 0;
                let costBasis = 0;
                for (const h of holdings) {
                    const currentScore = await getCurrentPrice(h.assetType, h.assetId);
                    holdingsValue += Number(h.shares) * currentScore;
                    costBasis += Number(h.shares) * Number(h.avgBuyPrice);
                }

                const cash = Number(p.cashBalance);
                const totalValue = cash + holdingsValue;
                const profitLoss = totalValue - 100; // Starting capital is 100

                return {
                    userId: p.userId,
                    totalValue,
                    profitLoss,
                    profitLossPercent: (profitLoss / 100) * 100,
                    winRate: p.winCount + p.lossCount > 0
                        ? (p.winCount / (p.winCount + p.lossCount)) * 100
                        : 0,
                };
            }));

            // Sort by totalValue and take top N
            return portfolioValues
                .sort((a, b) => b.totalValue - a.totalValue)
                .slice(0, input.limit)
                .map((p, i) => ({
                    rank: i + 1,
                    ...p,
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
     * ADMIN: Reset all portfolios to 100 pts and clear all holdings
     */
    resetAllPortfolios: protectedProcedure.mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

        // Delete all holdings
        const deletedHoldings = await db.delete(stockHoldings).returning();

        // Reset all portfolios to 100 pts
        const updatedPortfolios = await db
            .update(userPortfolios)
            .set({
                cashBalance: '100',
                totalValue: '100',
                totalProfitLoss: '0',
                winCount: 0,
                lossCount: 0,
                updatedAt: new Date().toISOString(),
            })
            .returning();

        // Optionally clear trade history
        await db.delete(tradeHistory);

        return {
            success: true,
            message: `Reset ${updatedPortfolios.length} portfolios to 100 pts, deleted ${deletedHoldings.length} holdings`,
            portfoliosReset: updatedPortfolios.length,
            holdingsDeleted: deletedHoldings.length,
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
            if (!db) return { standings: [], prizes: [], endsAt: '', daysRemaining: 0 };

            // Get all portfolios with holdings
            const portfolios = await db
                .select({
                    userId: userPortfolios.userId,
                    cashBalance: userPortfolios.cashBalance,
                    winCount: userPortfolios.winCount,
                    lossCount: userPortfolios.lossCount,
                })
                .from(userPortfolios)
                .limit(50);

            // Calculate dynamic values for each portfolio
            const portfolioValues = await Promise.all(portfolios.map(async (p) => {
                const holdings = await db
                    .select()
                    .from(stockHoldings)
                    .where(eq(stockHoldings.userId, p.userId));

                let holdingsValue = 0;
                for (const h of holdings) {
                    const currentScore = await getCurrentPrice(h.assetType, h.assetId);
                    holdingsValue += Number(h.shares) * currentScore;
                }

                const cash = Number(p.cashBalance);
                const totalValue = cash + holdingsValue;
                const profitLoss = totalValue - 100;

                return {
                    userId: p.userId,
                    totalValue,
                    profitLoss,
                    profitLossPercent: (profitLoss / 100) * 100,
                    trades: p.winCount + p.lossCount,
                    winRate: p.winCount + p.lossCount > 0
                        ? (p.winCount / (p.winCount + p.lossCount)) * 100
                        : 0,
                };
            }));

            // Sort by profitLoss and take top N
            const standings = portfolioValues
                .sort((a, b) => b.profitLoss - a.profitLoss)
                .slice(0, input.limit)
                .map((s, i) => ({ rank: i + 1, ...s }));

            // Calculate days until Sunday
            const now = new Date();
            const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
            const endDate = new Date(now);
            endDate.setDate(now.getDate() + daysUntilSunday);
            endDate.setHours(0, 0, 0, 0);

            return {
                standings,
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

            // Get total strains for rank bonus calculation
            const today = new Date().toISOString().split('T')[0];
            const [countResult] = await db
                .select({ count: sql<number>`count(*)` })
                .from(strainDailyChallengeStats)
                .where(eq(strainDailyChallengeStats.statDate, latestStats?.statDate || today));
            const totalStrains = Number(countResult?.count) || 50;

            // DYNAMIC SCORE CALCULATION (same formula as getStocks)
            const calculateScore = (stats: typeof latestStats) => {
                if (!stats) return 100;
                const orderScore = (stats.orderCount || 0) * 10;
                const rankBonus = (totalStrains - (stats.rank || totalStrains)) * 5;
                const trendMult = Number(stats.trendMultiplier || 1);
                const momentumBonus = Math.round((trendMult - 1) * 50);
                const consistencyBonus = Math.round((stats.consistencyScore || 0) / 5);
                const streakBonus = Math.min(stats.streakDays || 0, 14) * 2;
                return Math.max(10, orderScore + rankBonus + momentumBonus + consistencyBonus + streakBonus);
            };

            const currentScore = calculateScore(latestStats);

            // Calculate score change from previous day
            const yesterdayStats = history.length > 1 ? history[history.length - 2] : null;
            const yesterdayScore = yesterdayStats ? calculateScore({
                orderCount: yesterdayStats.orderCount,
                rank: yesterdayStats.rank,
                trendMultiplier: yesterdayStats.trendMultiplier,
                consistencyScore: yesterdayStats.consistencyScore,
                streakDays: yesterdayStats.streakDays,
            } as any) : currentScore;

            const scoreChange = currentScore - yesterdayScore;
            const scoreChangePercent = yesterdayScore > 0
                ? ((currentScore - yesterdayScore) / yesterdayScore) * 100
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

                // Current Score (not price!)
                currentScore,
                scoreChange,
                scoreChangePercent: Math.round(scoreChangePercent * 10) / 10,

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

                // Historical Data for Charts - now with SCORES
                scoreHistory: history.map(h => {
                    // Calculate historical score for each day
                    const dayScore = calculateScore({
                        orderCount: h.orderCount,
                        rank: h.rank,
                        trendMultiplier: h.trendMultiplier,
                        consistencyScore: h.consistencyScore,
                        streakDays: h.streakDays,
                    } as any);
                    return {
                        date: h.statDate,
                        score: dayScore,
                        orders: h.orderCount,
                        volume: h.salesVolumeGrams,
                        rank: h.rank,
                    };
                }),
            };
        }),

    /**
     * Get historical market data with timeframe support
     * Returns aggregated stats, type breakdowns, and historical chart data
     */
    getMarketHistory: publicProcedure
        .input(z.object({
            period: z.enum(['7d', '30d', '90d', '6m', '1y', 'all']).default('30d'),
        }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) return null;

            const { strainDailyChallengeStats } = await import('../../drizzle/dailyChallengeSchema');

            // Calculate date range based on period
            const now = new Date();
            let startDate = new Date();
            switch (input.period) {
                case '7d': startDate.setDate(now.getDate() - 7); break;
                case '30d': startDate.setDate(now.getDate() - 30); break;
                case '90d': startDate.setDate(now.getDate() - 90); break;
                case '6m': startDate.setMonth(now.getMonth() - 6); break;
                case '1y': startDate.setFullYear(now.getFullYear() - 1); break;
                case 'all': startDate = new Date('2024-01-01'); break;
            }
            const startDateStr = startDate.toISOString().split('T')[0];

            // Get historical data grouped by date with strain type info
            const historicalData = await db
                .select({
                    statDate: strainDailyChallengeStats.statDate,
                    strainId: strainDailyChallengeStats.strainId,
                    orderCount: strainDailyChallengeStats.orderCount,
                    rank: strainDailyChallengeStats.rank,
                    trendMultiplier: strainDailyChallengeStats.trendMultiplier,
                    consistencyScore: strainDailyChallengeStats.consistencyScore,
                    streakDays: strainDailyChallengeStats.streakDays,
                    strainType: cannabisStrains.type,
                    terpenes: cannabisStrains.terpenes,
                })
                .from(strainDailyChallengeStats)
                .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
                .where(gte(strainDailyChallengeStats.statDate, startDateStr))
                .orderBy(asc(strainDailyChallengeStats.statDate));

            // Group by date for chart data
            const dateMap = new Map<string, {
                totalScore: number;
                strainCount: number;
                indica: number;
                sativa: number;
                hybrid: number;
                totalOrders: number;
                terpeneScores: Record<string, { total: number; count: number }>;
            }>();

            // Get total strain count for scoring
            const [countResult] = await db
                .select({ count: sql<number>`count(distinct ${strainDailyChallengeStats.strainId})` })
                .from(strainDailyChallengeStats)
                .where(gte(strainDailyChallengeStats.statDate, startDateStr));
            const totalStrains = Number(countResult?.count) || 50;

            // Calculate dynamic score for each strain
            const calculateScore = (stats: any) => {
                const orderScore = (stats.orderCount || 0) * 10;
                const rankBonus = (totalStrains - (stats.rank || totalStrains)) * 5;
                const trendMult = Number(stats.trendMultiplier || 1);
                const momentumBonus = Math.round((trendMult - 1) * 50);
                const consistencyBonus = Math.round((stats.consistencyScore || 0) / 5);
                const streakBonus = Math.min(stats.streakDays || 0, 14) * 2;
                return Math.max(10, orderScore + rankBonus + momentumBonus + consistencyBonus + streakBonus);
            };

            // Terpene tracking (overall)
            const terpeneStats: Record<string, { totalScore: number; count: number }> = {};

            for (const row of historicalData) {
                const date = row.statDate;
                const score = calculateScore(row);
                const type = (row.strainType || 'hybrid').toLowerCase();

                if (!dateMap.has(date)) {
                    dateMap.set(date, {
                        totalScore: 0,
                        strainCount: 0,
                        indica: 0,
                        sativa: 0,
                        hybrid: 0,
                        totalOrders: 0,
                        terpeneScores: {},
                    });
                }

                const dayData = dateMap.get(date)!;
                dayData.totalScore += score;
                dayData.strainCount++;
                dayData.totalOrders += row.orderCount || 0;

                // Type breakdown
                if (type.includes('indica')) dayData.indica += score;
                else if (type.includes('sativa')) dayData.sativa += score;
                else dayData.hybrid += score;

                // Parse terpenes and track per-date
                if (row.terpenes) {
                    try {
                        const terps = JSON.parse(row.terpenes);
                        if (Array.isArray(terps)) {
                            for (const terp of terps.slice(0, 3)) { // Top 3 terpenes
                                const terpName = typeof terp === 'string' ? terp : terp.name;
                                if (terpName) {
                                    // Overall tracking
                                    if (!terpeneStats[terpName]) terpeneStats[terpName] = { totalScore: 0, count: 0 };
                                    terpeneStats[terpName].totalScore += score;
                                    terpeneStats[terpName].count++;

                                    // Per-date tracking
                                    if (!dayData.terpeneScores[terpName]) dayData.terpeneScores[terpName] = { total: 0, count: 0 };
                                    dayData.terpeneScores[terpName].total += score;
                                    dayData.terpeneScores[terpName].count++;
                                }
                            }
                        }
                    } catch { }
                }
            }

            // Get top 5 terpenes globally for consistent charting
            const topTerpeneNames = Object.entries(terpeneStats)
                .sort((a, b) => (b[1].totalScore / b[1].count) - (a[1].totalScore / a[1].count))
                .slice(0, 5)
                .map(([name]) => name);

            // Convert to arrays for chart
            const chartData = Array.from(dateMap.entries())
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([date, data]) => {
                    // Calculate terpene averages for this date
                    const terpenes: Record<string, number> = {};
                    for (const terpName of topTerpeneNames) {
                        const td = data.terpeneScores[terpName];
                        terpenes[terpName] = td ? Math.round(td.total / td.count) : 0;
                    }

                    return {
                        date,
                        avgScore: Math.round(data.totalScore / data.strainCount),
                        indica: Math.round(data.indica / data.strainCount),
                        sativa: Math.round(data.sativa / data.strainCount),
                        hybrid: Math.round(data.hybrid / data.strainCount),
                        totalOrders: data.totalOrders,
                        ...terpenes, // Spread terpene scores into chart data
                    };
                });

            // Top terpenes
            const topTerpenes = Object.entries(terpeneStats)
                .map(([name, stats]) => ({
                    name,
                    avgScore: Math.round(stats.totalScore / stats.count),
                    count: stats.count,
                }))
                .sort((a, b) => b.avgScore - a.avgScore)
                .slice(0, 8);

            // Calculate period changes
            const firstDay = chartData[0];
            const lastDay = chartData[chartData.length - 1];
            const periodChange = firstDay && lastDay
                ? ((lastDay.avgScore - firstDay.avgScore) / firstDay.avgScore) * 100
                : 0;

            return {
                period: input.period,
                chartData,
                topTerpenes,
                summary: {
                    currentAvgScore: lastDay?.avgScore || 0,
                    periodChange: Math.round(periodChange * 10) / 10,
                    totalDataPoints: chartData.length,
                    indicaAvg: Math.round(chartData.reduce((s, d) => s + d.indica, 0) / chartData.length) || 0,
                    sativaAvg: Math.round(chartData.reduce((s, d) => s + d.sativa, 0) / chartData.length) || 0,
                    hybridAvg: Math.round(chartData.reduce((s, d) => s + d.hybrid, 0) / chartData.length) || 0,
                },
            };
        }),

    // ============ WATCHLIST ============

    /**
     * Get user's watchlist with current scores
     */
    getWatchlist: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        const watchlist = await db
            .select({
                id: stockWatchlist.id,
                assetType: stockWatchlist.assetType,
                assetId: stockWatchlist.assetId,
                addedAt: stockWatchlist.addedAt,
                name: cannabisStrains.name,
                type: cannabisStrains.type,
                imageUrl: cannabisStrains.imageUrl,
            })
            .from(stockWatchlist)
            .leftJoin(cannabisStrains, eq(stockWatchlist.assetId, cannabisStrains.id))
            .where(eq(stockWatchlist.userId, ctx.user.id))
            .orderBy(desc(stockWatchlist.addedAt));

        // Get current scores for each item
        const items = await Promise.all(watchlist.map(async (item) => {
            const currentScore = await getCurrentPrice(item.assetType, item.assetId);
            return {
                ...item,
                currentScore,
            };
        }));

        return items;
    }),

    /**
     * Add to watchlist (max 20 items)
     */
    addToWatchlist: protectedProcedure
        .input(z.object({
            assetType: z.enum(['product', 'strain', 'manufacturer']),
            assetId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

            // Check limit
            const existing = await db
                .select({ count: sql<number>`count(*)` })
                .from(stockWatchlist)
                .where(eq(stockWatchlist.userId, ctx.user.id));

            if (Number(existing[0]?.count) >= 20) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Watchlist limit reached (max 20)' });
            }

            // Check if already exists
            const [alreadyExists] = await db
                .select()
                .from(stockWatchlist)
                .where(and(
                    eq(stockWatchlist.userId, ctx.user.id),
                    eq(stockWatchlist.assetType, input.assetType),
                    eq(stockWatchlist.assetId, input.assetId),
                ))
                .limit(1);

            if (alreadyExists) {
                return { success: true, message: 'Already on watchlist' };
            }

            await db.insert(stockWatchlist).values({
                userId: ctx.user.id,
                assetType: input.assetType,
                assetId: input.assetId,
            });

            return { success: true, message: 'Added to watchlist' };
        }),

    /**
     * Remove from watchlist
     */
    removeFromWatchlist: protectedProcedure
        .input(z.object({
            assetType: z.enum(['product', 'strain', 'manufacturer']),
            assetId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

            await db
                .delete(stockWatchlist)
                .where(and(
                    eq(stockWatchlist.userId, ctx.user.id),
                    eq(stockWatchlist.assetType, input.assetType),
                    eq(stockWatchlist.assetId, input.assetId),
                ));

            return { success: true, message: 'Removed from watchlist' };
        }),

    /**
     * Check if item is on watchlist
     */
    isOnWatchlist: protectedProcedure
        .input(z.object({
            assetType: z.enum(['product', 'strain', 'manufacturer']),
            assetId: z.number(),
        }))
        .query(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) return false;

            const [exists] = await db
                .select()
                .from(stockWatchlist)
                .where(and(
                    eq(stockWatchlist.userId, ctx.user.id),
                    eq(stockWatchlist.assetType, input.assetType),
                    eq(stockWatchlist.assetId, input.assetId),
                ))
                .limit(1);

            return !!exists;
        }),

    // ============ PRICE ALERTS ============

    /**
     * Create a price alert
     */
    createAlert: protectedProcedure
        .input(z.object({
            assetType: z.enum(['product', 'strain', 'manufacturer']),
            assetId: z.number(),
            assetName: z.string().optional(),
            targetScore: z.number().positive(),
            direction: z.enum(['above', 'below']),
        }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

            // Limit to 10 active alerts per user
            const existing = await db
                .select({ count: sql<number>`count(*)` })
                .from(priceAlerts)
                .where(and(
                    eq(priceAlerts.userId, ctx.user.id),
                    eq(priceAlerts.isTriggered, false),
                ));

            if (Number(existing[0]?.count) >= 10) {
                throw new TRPCError({ code: 'BAD_REQUEST', message: 'Alert limit reached (max 10 active)' });
            }

            await db.insert(priceAlerts).values({
                userId: ctx.user.id,
                assetType: input.assetType,
                assetId: input.assetId,
                assetName: input.assetName,
                targetScore: String(input.targetScore),
                direction: input.direction,
            });

            return { success: true, message: `Alert created: ${input.direction} ${input.targetScore} pts` };
        }),

    /**
     * Get user's alerts
     */
    getAlerts: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];

        const alerts = await db
            .select()
            .from(priceAlerts)
            .where(eq(priceAlerts.userId, ctx.user.id))
            .orderBy(desc(priceAlerts.createdAt));

        // Get current scores
        const items = await Promise.all(alerts.map(async (alert) => {
            const currentScore = await getCurrentPrice(alert.assetType, alert.assetId);
            return {
                ...alert,
                targetScore: Number(alert.targetScore),
                currentScore,
            };
        }));

        return items;
    }),

    /**
     * Delete an alert
     */
    deleteAlert: protectedProcedure
        .input(z.object({ alertId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

            await db
                .delete(priceAlerts)
                .where(and(
                    eq(priceAlerts.id, input.alertId),
                    eq(priceAlerts.userId, ctx.user.id),
                ));

            return { success: true, message: 'Alert deleted' };
        }),

    /**
     * Get count of triggered alerts (for badge)
     */
    getTriggeredAlertsCount: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return 0;

        const [result] = await db
            .select({ count: sql<number>`count(*)` })
            .from(priceAlerts)
            .where(and(
                eq(priceAlerts.userId, ctx.user.id),
                eq(priceAlerts.isTriggered, true),
            ));

        return Number(result?.count) || 0;
    }),
});
