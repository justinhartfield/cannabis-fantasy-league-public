/**
 * Stock Market Cron Jobs
 * 
 * Daily price updates and weekly competition resets
 */

import { getDb } from "./db";
import { stockPrices, userPortfolios, marketLeaderboard, marketAchievements } from "../drizzle/stockMarketSchema";
import { cannabisStrains, manufacturers } from "../drizzle/schema";
import { strainDailyChallengeStats, manufacturerDailyChallengeStats } from "../drizzle/dailyChallengeSchema";
import { eq, desc, sql, and, gte, lt } from "drizzle-orm";

const BASE_PRICE = 10.00;

interface PriceRecord {
    assetType: string;
    assetId: number;
    assetName: string;
    openPrice: number;
    closePrice: number;
    highPrice: number;
    lowPrice: number;
    volume: number;
    priceChange: number;
    priceChangePercent: number;
}

/**
 * Calculate and save daily prices for all assets
 */
export async function updateDailyPrices() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`[StockMarket] Updating prices for ${today}...`);

    // Get yesterday's prices for comparison
    const yesterdayPrices = await db
        .select()
        .from(stockPrices)
        .where(eq(stockPrices.priceDate, yesterdayStr));

    const yesterdayMap = new Map(
        yesterdayPrices.map(p => [`${p.assetType}-${p.assetId}`, Number(p.closePrice)])
    );

    const prices: PriceRecord[] = [];

    // Calculate strain prices
    const strainStats = await db
        .select({
            strainId: strainDailyChallengeStats.strainId,
            orderCount: strainDailyChallengeStats.orderCount,
            strainName: cannabisStrains.name,
        })
        .from(strainDailyChallengeStats)
        .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
        .where(eq(strainDailyChallengeStats.statDate, today))
        .orderBy(desc(strainDailyChallengeStats.orderCount));

    // If no today data, use yesterday
    const strainData = strainStats.length > 0 ? strainStats : await db
        .select({
            strainId: strainDailyChallengeStats.strainId,
            orderCount: strainDailyChallengeStats.orderCount,
            strainName: cannabisStrains.name,
        })
        .from(strainDailyChallengeStats)
        .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
        .where(eq(strainDailyChallengeStats.statDate, yesterdayStr))
        .orderBy(desc(strainDailyChallengeStats.orderCount));

    for (const data of strainData) {
        const orderMultiplier = Math.max(0.5, Math.min(5, (data.orderCount || 0) / 50));
        const closePrice = Math.round(BASE_PRICE * orderMultiplier * 100) / 100;

        const key = `strain-${data.strainId}`;
        const yesterdayPrice = yesterdayMap.get(key) || closePrice;
        const priceChange = Math.round((closePrice - yesterdayPrice) * 100) / 100;
        const priceChangePercent = yesterdayPrice > 0
            ? Math.round((priceChange / yesterdayPrice) * 10000) / 100
            : 0;

        prices.push({
            assetType: 'strain',
            assetId: data.strainId,
            assetName: data.strainName || '',
            openPrice: yesterdayPrice,
            closePrice,
            highPrice: Math.max(yesterdayPrice, closePrice),
            lowPrice: Math.min(yesterdayPrice, closePrice),
            volume: data.orderCount || 0,
            priceChange,
            priceChangePercent,
        });
    }

    // Calculate manufacturer prices
    const mfgStats = await db
        .select({
            mfgId: manufacturerDailyChallengeStats.manufacturerId,
            orderCount: manufacturerDailyChallengeStats.orderCount,
            mfgName: manufacturers.name,
        })
        .from(manufacturerDailyChallengeStats)
        .innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id))
        .where(eq(manufacturerDailyChallengeStats.statDate, today))
        .orderBy(desc(manufacturerDailyChallengeStats.orderCount));

    const mfgData = mfgStats.length > 0 ? mfgStats : await db
        .select({
            mfgId: manufacturerDailyChallengeStats.manufacturerId,
            orderCount: manufacturerDailyChallengeStats.orderCount,
            mfgName: manufacturers.name,
        })
        .from(manufacturerDailyChallengeStats)
        .innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id))
        .where(eq(manufacturerDailyChallengeStats.statDate, yesterdayStr))
        .orderBy(desc(manufacturerDailyChallengeStats.orderCount));

    for (const data of mfgData) {
        const orderMultiplier = Math.max(0.5, Math.min(5, (data.orderCount || 0) / 200));
        const closePrice = Math.round(25 * orderMultiplier * 100) / 100; // Hedge funds base €25

        const key = `manufacturer-${data.mfgId}`;
        const yesterdayPrice = yesterdayMap.get(key) || closePrice;
        const priceChange = Math.round((closePrice - yesterdayPrice) * 100) / 100;
        const priceChangePercent = yesterdayPrice > 0
            ? Math.round((priceChange / yesterdayPrice) * 10000) / 100
            : 0;

        prices.push({
            assetType: 'manufacturer',
            assetId: data.mfgId,
            assetName: data.mfgName || '',
            openPrice: yesterdayPrice,
            closePrice,
            highPrice: Math.max(yesterdayPrice, closePrice),
            lowPrice: Math.min(yesterdayPrice, closePrice),
            volume: data.orderCount || 0,
            priceChange,
            priceChangePercent,
        });
    }

    // Save all prices
    for (const price of prices) {
        await db
            .insert(stockPrices)
            .values({
                assetType: price.assetType,
                assetId: price.assetId,
                priceDate: today,
                openPrice: String(price.openPrice),
                closePrice: String(price.closePrice),
                highPrice: String(price.highPrice),
                lowPrice: String(price.lowPrice),
                volume: price.volume,
                priceChange: String(price.priceChange),
                priceChangePercent: String(price.priceChangePercent),
            })
            .onConflictDoUpdate({
                target: [stockPrices.assetType, stockPrices.assetId, stockPrices.priceDate],
                set: {
                    closePrice: String(price.closePrice),
                    highPrice: sql`GREATEST(${stockPrices.highPrice}::numeric, ${price.closePrice})`,
                    lowPrice: sql`LEAST(${stockPrices.lowPrice}::numeric, ${price.closePrice})`,
                    volume: price.volume,
                    priceChange: String(price.priceChange),
                    priceChangePercent: String(price.priceChangePercent),
                },
            });
    }

    console.log(`[StockMarket] ✅ Updated ${prices.length} prices`);
    return prices.length;
}

/**
 * Update daily leaderboard
 */
export async function updateDailyLeaderboard() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date().toISOString().split('T')[0];
    console.log(`[StockMarket] Updating leaderboard for ${today}...`);

    // Get all portfolios
    const portfolios = await db
        .select()
        .from(userPortfolios)
        .orderBy(desc(userPortfolios.totalValue));

    let rank = 1;
    for (const portfolio of portfolios) {
        const profitLoss = Number(portfolio.totalValue) - 100000;
        const profitLossPercent = (profitLoss / 100000) * 100;

        await db
            .insert(marketLeaderboard)
            .values({
                userId: portfolio.userId,
                period: 'daily',
                periodDate: today,
                portfolioValue: portfolio.totalValue,
                profitLoss: String(profitLoss),
                profitLossPercent: String(profitLossPercent),
                rank,
            })
            .onConflictDoUpdate({
                target: [marketLeaderboard.userId, marketLeaderboard.period, marketLeaderboard.periodDate],
                set: {
                    portfolioValue: portfolio.totalValue,
                    profitLoss: String(profitLoss),
                    profitLossPercent: String(profitLossPercent),
                    rank,
                },
            });

        rank++;
    }

    console.log(`[StockMarket] ✅ Updated ${portfolios.length} leaderboard entries`);
    return portfolios.length;
}

/**
 * Weekly competition reset - runs every Sunday at midnight
 */
export async function runWeeklyCompetition() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const weekEnd = today.toISOString().split('T')[0];

    // Calculate week start (last Monday)
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    console.log(`[StockMarket] Running weekly competition for ${weekStartStr} to ${weekEnd}...`);

    // Get top performers of the week
    const topPerformers = await db
        .select({
            userId: userPortfolios.userId,
            totalValue: userPortfolios.totalValue,
            totalProfitLoss: userPortfolios.totalProfitLoss,
        })
        .from(userPortfolios)
        .orderBy(desc(userPortfolios.totalProfitLoss))
        .limit(10);

    // Award achievements/points to top 3
    const rewards = [
        { place: 1, points: 1000, achievement: 'weekly_champion', name: '🏆 Weekly Champion' },
        { place: 2, points: 500, achievement: 'weekly_silver', name: '🥈 Weekly Runner-Up' },
        { place: 3, points: 250, achievement: 'weekly_bronze', name: '🥉 Weekly Bronze' },
    ];

    for (let i = 0; i < Math.min(3, topPerformers.length); i++) {
        const performer = topPerformers[i];
        const reward = rewards[i];

        // Record weekly leaderboard
        await db
            .insert(marketLeaderboard)
            .values({
                userId: performer.userId,
                period: 'weekly',
                periodDate: weekEnd,
                portfolioValue: performer.totalValue,
                profitLoss: performer.totalProfitLoss,
                profitLossPercent: String((Number(performer.totalProfitLoss) / 100000) * 100),
                rank: i + 1,
            })
            .onConflictDoNothing();

        // Award achievement
        await db
            .insert(marketAchievements)
            .values({
                userId: performer.userId,
                achievementType: reward.achievement,
                achievementName: reward.name,
                description: `Earned ${reward.points} BudsRewards points for week of ${weekStartStr}`,
            })
            .onConflictDoNothing();

        console.log(`[StockMarket] 🏆 User ${performer.userId} won ${reward.name} (+${reward.points} points)`);
    }

    // Reset all portfolios for new week
    await db
        .update(userPortfolios)
        .set({
            cashBalance: '100000',
            totalValue: '100000',
            totalProfitLoss: '0',
            winCount: 0,
            lossCount: 0,
            updatedAt: new Date().toISOString(),
        });

    console.log(`[StockMarket] ✅ Weekly competition complete, portfolios reset`);
    return topPerformers.slice(0, 3);
}

/**
 * Schedule all cron jobs
 */
export function scheduleStockMarketCrons() {
    // Update prices daily at 6 AM
    const scheduleDaily = () => {
        const now = new Date();
        const next6AM = new Date(now);
        next6AM.setHours(6, 0, 0, 0);
        if (next6AM <= now) {
            next6AM.setDate(next6AM.getDate() + 1);
        }

        const msUntil = next6AM.getTime() - now.getTime();
        console.log(`[StockMarket] Next price update scheduled for ${next6AM.toISOString()}`);

        setTimeout(async () => {
            try {
                await updateDailyPrices();
                await updateDailyLeaderboard();
            } catch (error) {
                console.error('[StockMarket] Daily update failed:', error);
            }
            scheduleDaily(); // Reschedule for tomorrow
        }, msUntil);
    };

    // Weekly competition every Sunday at midnight
    const scheduleWeekly = () => {
        const now = new Date();
        const nextSunday = new Date(now);
        const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
        nextSunday.setDate(now.getDate() + daysUntilSunday);
        nextSunday.setHours(0, 0, 0, 0);

        const msUntil = nextSunday.getTime() - now.getTime();
        console.log(`[StockMarket] Next weekly competition at ${nextSunday.toISOString()}`);

        setTimeout(async () => {
            try {
                await runWeeklyCompetition();
            } catch (error) {
                console.error('[StockMarket] Weekly competition failed:', error);
            }
            scheduleWeekly(); // Reschedule for next week
        }, msUntil);
    };

    scheduleDaily();
    scheduleWeekly();
}

// Run immediately if main module
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
    (async () => {
        console.log('[StockMarket] Running manual price update...');
        await updateDailyPrices();
        await updateDailyLeaderboard();
        console.log('[StockMarket] Done!');
        process.exit(0);
    })();
}
