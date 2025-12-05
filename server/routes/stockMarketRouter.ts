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
import { eq, and, desc, sql, gte } from 'drizzle-orm';
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

            const today = new Date().toISOString().split('T')[0];

            let query = db
                .select()
                .from(stockPrices)
                .where(eq(stockPrices.priceDate, today));

            if (input.assetType) {
                query = query.where(and(
                    eq(stockPrices.priceDate, today),
                    eq(stockPrices.assetType, input.assetType)
                ));
            }

            const prices = await query
                .orderBy(
                    input.sortBy === 'price' ? desc(stockPrices.closePrice) :
                        input.sortBy === 'change' ? desc(stockPrices.priceChangePercent) :
                            desc(stockPrices.volume)
                )
                .limit(input.limit);

            // Enrich with asset names
            return Promise.all(prices.map(async (p) => {
                let assetName = '';
                if (p.assetType === 'product' || p.assetType === 'strain') {
                    const [strain] = await db
                        .select({ name: cannabisStrains.name })
                        .from(cannabisStrains)
                        .where(eq(cannabisStrains.id, p.assetId))
                        .limit(1);
                    assetName = strain?.name || '';
                } else if (p.assetType === 'manufacturer') {
                    const [mfg] = await db
                        .select({ name: manufacturers.name })
                        .from(manufacturers)
                        .where(eq(manufacturers.id, p.assetId))
                        .limit(1);
                    assetName = mfg?.name || '';
                }

                return {
                    ...p,
                    assetName,
                    closePrice: Number(p.closePrice),
                    priceChange: Number(p.priceChange),
                    priceChangePercent: Number(p.priceChangePercent),
                };
            }));
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
        const today = new Date().toISOString().split('T')[0];

        const productPrices = await calculateProductPrices(today);
        await savePrices(productPrices, today);

        return {
            success: true,
            message: `Updated ${productPrices.length} prices`,
        };
    }),
});
