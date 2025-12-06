/**
 * Stock Market Pricing Engine
 * 
 * Calculates prices for:
 * - Products (individual stocks) based on daily order volume
 * - Strains (mutual funds) as weighted NAV of products
 * - Manufacturers (hedge funds) as aggregate of strains
 */

import { getDb } from "./db";
import { strains, cannabisStrains, manufacturers } from "../drizzle/schema";
import { strainDailyChallengeStats, manufacturerDailyChallengeStats } from "../drizzle/dailyChallengeSchema";
import { stockPrices } from "../drizzle/stockMarketSchema";
import { eq, desc, sql, and, gte, avg } from "drizzle-orm";

const BASE_PRICE = 10.00; // All stocks start at €10
const VOLATILITY_RANGE = 0.2; // ±20% random volatility

interface StockPrice {
    assetType: 'product' | 'strain' | 'manufacturer';
    assetId: number;
    assetName: string;
    price: number;
    priceChange: number;
    priceChangePercent: number;
    volume: number;
}

/**
 * Calculate product stock prices from daily order data
 */
export async function calculateProductPrices(date: string): Promise<StockPrice[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get today's order data for products
    const todayStats = await db
        .select({
            productId: strainDailyChallengeStats.strainId,
            productName: cannabisStrains.name,
            orderCount: strainDailyChallengeStats.orderCount,
            salesVolume: strainDailyChallengeStats.salesVolumeGrams,
        })
        .from(strainDailyChallengeStats)
        .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
        .where(eq(strainDailyChallengeStats.statDate, date))
        .orderBy(desc(strainDailyChallengeStats.orderCount));

    // Get 30-day average for comparison
    const thirtyDaysAgo = new Date(date);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const avgStats = await db
        .select({
            productId: strainDailyChallengeStats.strainId,
            avgOrders: sql<number>`AVG(${strainDailyChallengeStats.orderCount})`,
        })
        .from(strainDailyChallengeStats)
        .where(gte(strainDailyChallengeStats.statDate, thirtyDaysAgoStr))
        .groupBy(strainDailyChallengeStats.strainId);

    const avgMap = new Map(avgStats.map(s => [s.productId, Number(s.avgOrders) || 1]));

    // Get yesterday's prices for change calculation
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const yesterdayPrices = await db
        .select()
        .from(stockPrices)
        .where(and(
            eq(stockPrices.assetType, 'product'),
            eq(stockPrices.priceDate, yesterdayStr)
        ));

    const yesterdayPriceMap = new Map(
        yesterdayPrices.map(p => [p.assetId, Number(p.closePrice)])
    );

    const prices: StockPrice[] = [];

    for (const product of todayStats) {
        const avgOrders = avgMap.get(product.productId) || 1;
        const orderRatio = (product.orderCount || 0) / avgOrders;

        // Add slight randomness for market feel
        const volatility = 1 + (Math.random() * VOLATILITY_RANGE * 2 - VOLATILITY_RANGE);

        // Price formula: BASE × (today/avg) × volatility
        const price = Math.max(0.01, BASE_PRICE * orderRatio * volatility);
        const roundedPrice = Math.round(price * 100) / 100;

        const yesterdayPrice = yesterdayPriceMap.get(product.productId) || BASE_PRICE;
        const priceChange = roundedPrice - yesterdayPrice;
        const priceChangePercent = (priceChange / yesterdayPrice) * 100;

        prices.push({
            assetType: 'product',
            assetId: product.productId,
            assetName: product.productName || `Product #${product.productId}`,
            price: roundedPrice,
            priceChange: Math.round(priceChange * 100) / 100,
            priceChangePercent: Math.round(priceChangePercent * 100) / 100,
            volume: product.orderCount || 0,
        });
    }

    return prices;
}

/**
 * Calculate strain mutual fund NAV from product prices
 */
export async function calculateStrainNAV(date: string): Promise<StockPrice[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get all strains
    const allStrains = await db
        .select({
            id: cannabisStrains.id,
            name: cannabisStrains.name,
        })
        .from(cannabisStrains);

    // Get today's product prices
    const productPrices = await db
        .select()
        .from(stockPrices)
        .where(and(
            eq(stockPrices.assetType, 'product'),
            eq(stockPrices.priceDate, date)
        ));

    // For now, strain NAV = average of all product prices with that strain
    // In real implementation, you'd weight by volume
    const prices: StockPrice[] = [];

    for (const strain of allStrains) {
        // Find products for this strain (simplified - in reality would use product-strain mapping)
        const strainProducts = productPrices.filter(p => p.assetId === strain.id);

        if (strainProducts.length === 0) {
            // No products, use base price
            prices.push({
                assetType: 'strain',
                assetId: strain.id,
                assetName: strain.name || `Strain #${strain.id}`,
                price: BASE_PRICE,
                priceChange: 0,
                priceChangePercent: 0,
                volume: 0,
            });
            continue;
        }

        // Calculate weighted NAV
        const totalVolume = strainProducts.reduce((sum, p) => sum + p.volume, 0);
        const nav = strainProducts.reduce((sum, p) => {
            const weight = totalVolume > 0 ? p.volume / totalVolume : 1 / strainProducts.length;
            return sum + Number(p.closePrice) * weight;
        }, 0);

        const roundedNav = Math.round(nav * 100) / 100;

        // Get yesterday's NAV
        const yesterday = new Date(date);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const [yesterdayNav] = await db
            .select()
            .from(stockPrices)
            .where(and(
                eq(stockPrices.assetType, 'strain'),
                eq(stockPrices.assetId, strain.id),
                eq(stockPrices.priceDate, yesterdayStr)
            ))
            .limit(1);

        const prevNav = yesterdayNav ? Number(yesterdayNav.closePrice) : BASE_PRICE;
        const navChange = roundedNav - prevNav;
        const navChangePercent = (navChange / prevNav) * 100;

        prices.push({
            assetType: 'strain',
            assetId: strain.id,
            assetName: strain.name || `Strain #${strain.id}`,
            price: roundedNav,
            priceChange: Math.round(navChange * 100) / 100,
            priceChangePercent: Math.round(navChangePercent * 100) / 100,
            volume: totalVolume,
        });
    }

    return prices;
}

/**
 * Calculate manufacturer hedge fund AUM
 */
export async function calculateManufacturerAUM(date: string): Promise<StockPrice[]> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Get manufacturer stats
    const mfgStats = await db
        .select({
            mfgId: manufacturerDailyChallengeStats.manufacturerId,
            mfgName: manufacturers.name,
            orderCount: manufacturerDailyChallengeStats.orderCount,
            totalPoints: manufacturerDailyChallengeStats.totalPoints,
        })
        .from(manufacturerDailyChallengeStats)
        .innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id))
        .where(eq(manufacturerDailyChallengeStats.statDate, date))
        .orderBy(desc(manufacturerDailyChallengeStats.orderCount));

    const prices: StockPrice[] = [];

    for (const mfg of mfgStats) {
        // Manufacturer price based on performance (simplified)
        const price = BASE_PRICE * Math.max(0.5, Math.min(3, (mfg.orderCount || 0) / 100));
        const roundedPrice = Math.round(price * 100) / 100;

        prices.push({
            assetType: 'manufacturer',
            assetId: mfg.mfgId,
            assetName: mfg.mfgName || `Manufacturer #${mfg.mfgId}`,
            price: roundedPrice,
            priceChange: 0, // TODO: calculate from yesterday
            priceChangePercent: 0,
            volume: mfg.orderCount || 0,
        });
    }

    return prices;
}

/**
 * Save prices to database
 */
export async function savePrices(prices: StockPrice[], date: string): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    for (const price of prices) {
        await db
            .insert(stockPrices)
            .values({
                assetType: price.assetType,
                assetId: price.assetId,
                priceDate: date,
                openPrice: String(price.price),
                closePrice: String(price.price),
                highPrice: String(price.price),
                lowPrice: String(price.price),
                volume: price.volume,
                priceChange: String(price.priceChange),
                priceChangePercent: String(price.priceChangePercent),
            })
            .onConflictDoUpdate({
                target: [stockPrices.assetType, stockPrices.assetId, stockPrices.priceDate],
                set: {
                    closePrice: String(price.price),
                    highPrice: sql`GREATEST(${stockPrices.highPrice}, ${price.price})`,
                    lowPrice: sql`LEAST(${stockPrices.lowPrice}, ${price.price})`,
                    volume: price.volume,
                    priceChange: String(price.priceChange),
                    priceChangePercent: String(price.priceChangePercent),
                },
            });
    }
}

/**
 * Get current dynamic score for an asset (replaces old static price)
 * Computes score from strainDailyChallengeStats using popularity/momentum formula
 */
export async function getCurrentPrice(assetType: string, assetId: number): Promise<number> {
    const db = await getDb();
    if (!db) return BASE_PRICE;

    // For strains, calculate dynamic score from daily challenge stats
    if (assetType === 'strain' || assetType === 'product') {
        const today = new Date().toISOString().split('T')[0];

        // Get today's stats for this strain
        const [todayStats] = await db
            .select({
                orderCount: strainDailyChallengeStats.orderCount,
                rank: strainDailyChallengeStats.rank,
                trendMultiplier: strainDailyChallengeStats.trendMultiplier,
                consistencyScore: strainDailyChallengeStats.consistencyScore,
                streakDays: strainDailyChallengeStats.streakDays,
            })
            .from(strainDailyChallengeStats)
            .where(and(
                eq(strainDailyChallengeStats.strainId, assetId),
                eq(strainDailyChallengeStats.statDate, today)
            ))
            .limit(1);

        if (!todayStats) {
            // No stats today, try yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const [yesterdayStats] = await db
                .select({
                    orderCount: strainDailyChallengeStats.orderCount,
                    rank: strainDailyChallengeStats.rank,
                    trendMultiplier: strainDailyChallengeStats.trendMultiplier,
                    consistencyScore: strainDailyChallengeStats.consistencyScore,
                    streakDays: strainDailyChallengeStats.streakDays,
                })
                .from(strainDailyChallengeStats)
                .where(and(
                    eq(strainDailyChallengeStats.strainId, assetId),
                    eq(strainDailyChallengeStats.statDate, yesterdayStr)
                ))
                .limit(1);

            if (!yesterdayStats) return 100; // Default score

            return calculateDynamicScore(yesterdayStats, 50); // Assume 50 total strains
        }

        // Get total strain count for ranking bonus
        const [countResult] = await db
            .select({ count: sql<number>`count(distinct ${strainDailyChallengeStats.strainId})` })
            .from(strainDailyChallengeStats)
            .where(eq(strainDailyChallengeStats.statDate, today));
        const totalStrains = Number(countResult?.count) || 50;

        return calculateDynamicScore(todayStats, totalStrains);
    }

    // For manufacturers, fall back to old price table for now
    const today = new Date().toISOString().split('T')[0];
    const [price] = await db
        .select()
        .from(stockPrices)
        .where(and(
            eq(stockPrices.assetType, assetType),
            eq(stockPrices.assetId, assetId),
            eq(stockPrices.priceDate, today)
        ))
        .limit(1);

    return price ? Number(price.closePrice) : BASE_PRICE;
}

/**
 * Calculate dynamic score from strain stats
 */
function calculateDynamicScore(stats: {
    orderCount: number | null;
    rank: number | null;
    trendMultiplier: string | null;
    consistencyScore: string | null;
    streakDays: number | null;
}, totalStrains: number): number {
    // Order-based score (primary factor)
    const orderScore = (stats.orderCount || 0) * 10;

    // Rank bonus (higher rank = more bonus)
    const rank = stats.rank || totalStrains;
    const rankBonus = (totalStrains - rank) * 5;

    // Momentum bonus from trend multiplier
    const trendMultiplier = Number(stats.trendMultiplier || 1);
    const momentumBonus = Math.round((trendMultiplier - 1) * 50);

    // Consistency bonus
    const consistencyBonus = Math.round(Number(stats.consistencyScore || 0) / 5);

    // Streak bonus (capped at 14 days)
    const streakBonus = Math.min(stats.streakDays || 0, 14) * 2;

    // Calculate total score (minimum 10)
    return Math.max(10, orderScore + rankBonus + momentumBonus + consistencyBonus + streakBonus);
}

/**
 * Run daily price calculation
 */
export async function calculateAllPrices(date?: string): Promise<void> {
    const priceDate = date || new Date().toISOString().split('T')[0];
    console.log(`Calculating prices for ${priceDate}...`);

    const productPrices = await calculateProductPrices(priceDate);
    console.log(`✅ Calculated ${productPrices.length} product prices`);
    await savePrices(productPrices, priceDate);

    const strainPrices = await calculateStrainNAV(priceDate);
    console.log(`✅ Calculated ${strainPrices.length} strain NAVs`);
    await savePrices(strainPrices, priceDate);

    const mfgPrices = await calculateManufacturerAUM(priceDate);
    console.log(`✅ Calculated ${mfgPrices.length} manufacturer AUMs`);
    await savePrices(mfgPrices, priceDate);

    console.log('🎉 All prices calculated and saved!');
}
