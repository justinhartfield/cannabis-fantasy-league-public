/**
 * Daily Challenge Aggregator V2
 * Enhanced version with trend-based scoring integration
 * 
 * This aggregator fetches TrendMetrics data and uses the new trend-based scoring engine
 * while maintaining backward compatibility with the old scoring system.
 */

import { getDb } from './db';
import { getMetabaseClient } from './metabase';
import {
  calculateManufacturerScore as calculateOldManufacturerScore,
  calculateStrainScore as calculateOldStrainScore,
  calculateProductScore as calculateOldProductScore,
  calculatePharmacyScore as calculateOldPharmacyScore,
} from './dailyChallengeScoringEngine';
import {
  calculateManufacturerTrendScore,
  calculateStrainTrendScore,
  calculateProductTrendScore,
  calculatePharmacyTrendScore,
} from './trendScoringEngine';
import {
  fetchTrendDataForScoring,
} from './trendMetricsFetcher';
import {
  manufacturerDailyChallengeStats,
  strainDailyChallengeStats,
  productDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats,
} from '../drizzle/dailyChallengeSchema';
import { brands } from '../drizzle/schema';
import { calculateBrandScore as calculateDailyBrandScore } from './dailyChallengeScoringEngine';

interface OrderRecord {
  ID: string;
  Status: string;
  OrderDate: string;
  Quantity: number;
  TotalPrice: number;
  ProductManufacturer: string;
  ProductStrainName: string;
  ProductBrand?: string;
  PharmacyName: string;
  Product: string;
  Pharmacy: string;
}

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

type AggregationLogger = {
  info?: (message: string, metadata?: any) => Promise<void> | void;
  warn?: (message: string, metadata?: any) => Promise<void> | void;
  error?: (message: string, metadata?: any) => Promise<void> | void;
};

export type EntityAggregationSummary = {
  processed: number;
  skipped: number;
};

export type DailyChallengeAggregationSummary = {
  statDate: string;
  totalOrders: number;
  manufacturers: EntityAggregationSummary;
  strains: EntityAggregationSummary;
  products: EntityAggregationSummary;
  pharmacies: EntityAggregationSummary;
  brands: EntityAggregationSummary;
};

type AggregationOptions = {
  logger?: AggregationLogger;
  useTrendScoring?: boolean; // Toggle between old and new scoring
};

export class DailyChallengeAggregatorV2 {
  private metabase = getMetabaseClient();

  private async log(
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown> | unknown,
    logger?: AggregationLogger
  ) {
    const prefix = '[DailyChallengeAggregatorV2]';
    const consoleArgs: [string, any] =
      metadata === undefined ? [`${prefix} ${message}`, ''] : [`${prefix} ${message}`, metadata];

    try {
      const fn = logger?.[level];
      if (fn) {
        await fn(message, metadata);
      }
    } catch (err) {
      console.error(`${prefix} Logger callback failed`, err);
    }

    if (level === 'error') {
      console.error(...consoleArgs);
    } else if (level === 'warn') {
      console.warn(...consoleArgs);
    } else {
      console.log(...consoleArgs);
    }
  }

  /**
   * Aggregate manufacturer stats with trend-based scoring
   */
  private async aggregateManufacturersWithTrends(
    db: Database,
    dateString: string,
    orders: OrderRecord[],
    logger?: AggregationLogger
  ): Promise<EntityAggregationSummary> {
    await this.log('info', 'Aggregating manufacturers with trend-based scoring...', undefined, logger);

    // Group by manufacturer
    const stats = new Map<string, { salesVolumeGrams: number; orderCount: number; revenueCents: number }>();

    for (const order of orders) {
      const name = order.ProductManufacturer;
      if (!name) continue;

      const quantity = order.Quantity || 0;
      const revenue = Math.round((order.TotalPrice || 0) * 100);

      const current = stats.get(name) || { salesVolumeGrams: 0, orderCount: 0, revenueCents: 0 };
      current.salesVolumeGrams += quantity;
      current.orderCount += 1;
      current.revenueCents += revenue;
      stats.set(name, current);
    }

    const sorted = Array.from(stats.entries()).sort((a, b) => b[1].salesVolumeGrams - a[1].salesVolumeGrams);
    await this.log('info', `Found ${stats.size} unique manufacturers`, undefined, logger);

    let processed = 0;
    let skipped = 0;

    for (let i = 0; i < sorted.length; i++) {
      const [name, data] = sorted[i];
      const rank = i + 1;

      // Find manufacturer in database
      const manufacturer = await db.query.manufacturers.findFirst({
        where: (manufacturers, { eq }) => eq(manufacturers.name, name),
      });

      if (!manufacturer) {
        skipped += 1;
        await this.log('warn', `Manufacturer not found: ${name}`, undefined, logger);
        continue;
      }

      try {
        // Fetch trend data
        const trendData = await fetchTrendDataForScoring(
          'productManufacturer',
          name,
          manufacturer.id,
          dateString,
          rank
        );

        // Calculate trend-based score
        const trendScore = calculateManufacturerTrendScore({
          orderCount: data.orderCount,
          days1: trendData.trendMetrics?.days1 || 0,
          days7: trendData.trendMetrics?.days7 || 0,
          days14: trendData.trendMetrics?.days14,
          previousRank: trendData.previousRank,
          currentRank: rank,
          streakDays: trendData.streakDays,
          marketSharePercent: trendData.marketShare,
          dailyVolumes: trendData.dailyVolumes,
        });

        // Also calculate old score for comparison
        const oldScore = calculateOldManufacturerScore(data, rank);

        // Upsert stats with new fields
        await db
          .insert(manufacturerDailyChallengeStats)
          .values({
            manufacturerId: manufacturer.id,
            statDate: dateString,
            salesVolumeGrams: data.salesVolumeGrams,
            orderCount: data.orderCount,
            revenueCents: data.revenueCents,
            totalPoints: trendScore.totalPoints,
            rank,
            previousRank: trendData.previousRank,
            trendMultiplier: trendScore.trendMultiplier.toString(),
            consistencyScore: trendScore.consistencyScore,
            velocityScore: trendScore.velocityScore,
            streakDays: trendData.streakDays,
            marketSharePercent: trendData.marketShare.toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              manufacturerDailyChallengeStats.manufacturerId,
              manufacturerDailyChallengeStats.statDate,
            ],
            set: {
              salesVolumeGrams: data.salesVolumeGrams,
              orderCount: data.orderCount,
              revenueCents: data.revenueCents,
              totalPoints: trendScore.totalPoints,
              rank,
              previousRank: trendData.previousRank,
              trendMultiplier: trendScore.trendMultiplier.toString(),
              consistencyScore: trendScore.consistencyScore,
              velocityScore: trendScore.velocityScore,
              streakDays: trendData.streakDays,
              marketSharePercent: trendData.marketShare.toString(),
              updatedAt: new Date(),
            },
          });

        processed += 1;

        await this.log(
          'info',
          `${name}: ${data.orderCount} orders, ${trendScore.trendMultiplier.toFixed(2)}x trend, ${trendScore.totalPoints} pts (rank #${rank})`,
          { oldScore: oldScore.totalPoints, newScore: trendScore.totalPoints },
          logger
        );
      } catch (error) {
        await this.log('error', `Error processing manufacturer ${name}:`, error, logger);
        skipped += 1;
      }
    }

    return { processed, skipped };
  }

  /**
   * Aggregate strain stats with trend-based scoring
   */
  private async aggregateStrainsWithTrends(
    db: Database,
    dateString: string,
    orders: OrderRecord[],
    logger?: AggregationLogger
  ): Promise<EntityAggregationSummary> {
    await this.log('info', 'Aggregating strains with trend-based scoring...', undefined, logger);

    const stats = new Map<string, { salesVolumeGrams: number; orderCount: number }>();

    for (const order of orders) {
      const name = order.ProductStrainName;
      if (!name) continue;

      const quantity = order.Quantity || 0;
      const current = stats.get(name) || { salesVolumeGrams: 0, orderCount: 0 };
      current.salesVolumeGrams += quantity;
      current.orderCount += 1;
      stats.set(name, current);
    }

    const sorted = Array.from(stats.entries()).sort((a, b) => b[1].salesVolumeGrams - a[1].salesVolumeGrams);
    let processed = 0;
    let skipped = 0;

    for (let i = 0; i < sorted.length; i++) {
      const [name, data] = sorted[i];
      const rank = i + 1;

      const strain = await db.query.cannabisStrains.findFirst({
        where: (cannabisStrains, { eq }) => eq(cannabisStrains.name, name),
      });

      if (!strain) {
        skipped += 1;
        continue;
      }

      try {
        const trendData = await fetchTrendDataForScoring(
          'productStrainName',
          name,
          strain.id,
          dateString,
          rank
        );

        const trendScore = calculateStrainTrendScore({
          orderCount: data.orderCount,
          days1: trendData.trendMetrics?.days1 || 0,
          days7: trendData.trendMetrics?.days7 || 0,
          days14: trendData.trendMetrics?.days14,
          previousRank: trendData.previousRank,
          currentRank: rank,
          streakDays: trendData.streakDays,
          marketSharePercent: trendData.marketShare,
          dailyVolumes: trendData.dailyVolumes,
        });

        await db
          .insert(strainDailyChallengeStats)
          .values({
            strainId: strain.id,
            statDate: dateString,
            salesVolumeGrams: data.salesVolumeGrams,
            orderCount: data.orderCount,
            totalPoints: trendScore.totalPoints,
            rank,
            previousRank: trendData.previousRank,
            trendMultiplier: trendScore.trendMultiplier.toString(),
            consistencyScore: trendScore.consistencyScore,
            velocityScore: trendScore.velocityScore,
            streakDays: trendData.streakDays,
            marketSharePercent: trendData.marketShare.toString(),
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [strainDailyChallengeStats.strainId, strainDailyChallengeStats.statDate],
            set: {
              salesVolumeGrams: data.salesVolumeGrams,
              orderCount: data.orderCount,
              totalPoints: trendScore.totalPoints,
              rank,
              previousRank: trendData.previousRank,
              trendMultiplier: trendScore.trendMultiplier.toString(),
              consistencyScore: trendScore.consistencyScore,
              velocityScore: trendScore.velocityScore,
              streakDays: trendData.streakDays,
              marketSharePercent: trendData.marketShare.toString(),
              updatedAt: new Date(),
            },
          });

        processed += 1;
      } catch (error) {
        await this.log('error', `Error processing strain ${name}:`, error, logger);
        skipped += 1;
      }
    }

    return { processed, skipped };
  }

  /**
   * Aggregate brand stats and calculate scores
   */
  private async aggregateBrands(
    db: Database,
    dateString: string,
    _orders: OrderRecord[],
    logger?: AggregationLogger
  ): Promise<EntityAggregationSummary> {
    await this.log('info', 'Aggregating brands from ratings data...', undefined, logger);

    // Brands use ratings data, not order data
    // Fetch from Metabase question that aggregates brand ratings
    // Note: The ratings are cumulative, not daily, so we use the latest snapshot
    const ratingsData = await this.fetchBrandRatings();
    
    if (!ratingsData || ratingsData.length === 0) {
      await this.log('warn', 'No brand ratings data found', undefined, logger);
      return { processed: 0, skipped: 0 };
    }

    // Sort by total ratings (engagement) to determine rank
    const sorted = ratingsData
      .filter(b => b.totalRatings > 0) // Only include brands with ratings
      .sort((a, b) => b.totalRatings - a.totalRatings);

    let processed = 0;
    let skipped = 0;

    for (let i = 0; i < sorted.length; i++) {
      const brandData = sorted[i];
      const rank = i + 1;

      const brand = await db.query.brands.findFirst({
        where: (brands, { eq }) => eq(brands.name, brandData.name),
      });

      if (!brand) {
        skipped += 1;
        await this.log('warn', `Brand not found in DB: ${brandData.name}`, undefined, logger);
        continue;
      }

      const scoring = calculateDailyBrandScore({
        totalRatings: brandData.totalRatings,
        averageRating: brandData.averageRating,
        bayesianAverage: brandData.bayesianAverage,
        veryGoodCount: brandData.veryGoodCount,
        goodCount: brandData.goodCount,
        acceptableCount: brandData.acceptableCount,
        badCount: brandData.badCount,
        veryBadCount: brandData.veryBadCount,
      }, rank);

      await db
        .insert(brandDailyChallengeStats)
        .values({
          brandId: brand.id,
          statDate: dateString,
          totalRatings: brandData.totalRatings,
          averageRating: brandData.averageRating.toString(),
          bayesianAverage: brandData.bayesianAverage.toString(),
          veryGoodCount: brandData.veryGoodCount,
          goodCount: brandData.goodCount,
          acceptableCount: brandData.acceptableCount,
          badCount: brandData.badCount,
          veryBadCount: brandData.veryBadCount,
          totalPoints: scoring.totalPoints,
          rank,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [brandDailyChallengeStats.brandId, brandDailyChallengeStats.statDate],
          set: {
            totalRatings: brandData.totalRatings,
            averageRating: brandData.averageRating.toString(),
            bayesianAverage: brandData.bayesianAverage.toString(),
            veryGoodCount: brandData.veryGoodCount,
            goodCount: brandData.goodCount,
            acceptableCount: brandData.acceptableCount,
            badCount: brandData.badCount,
            veryBadCount: brandData.veryBadCount,
            totalPoints: scoring.totalPoints,
            rank,
            updatedAt: new Date(),
          },
        });

      processed += 1;
      await this.log(
        'info',
        `${brandData.name}: ${brandData.totalRatings} ratings, avg ${brandData.averageRating}, ${scoring.totalPoints} pts (rank #${rank})`,
        undefined,
        logger
      );
    }

    return { processed, skipped };
  }

  /**
   * Fetch brand ratings from Metabase
   * Uses the brand ratings aggregation query
   */
  private async fetchBrandRatings(): Promise<Array<{
    name: string;
    totalRatings: number;
    averageRating: number;
    bayesianAverage: number;
    veryGoodCount: number;
    goodCount: number;
    acceptableCount: number;
    badCount: number;
    veryBadCount: number;
  }>> {
    try {
      // The Metabase query URL provided shows this is a custom aggregation
      // We need to execute it as a card query
      // For now, we'll use a placeholder card ID - you'll need to save the query and get the ID
      const BRAND_RATINGS_CARD_ID = 1265; // TODO: Update with actual saved question ID
      
      const result = await this.metabase.executeCardQuery(BRAND_RATINGS_CARD_ID, {});
      
      return result.map((row: any) => ({
        name: row.Name || row.name,
        totalRatings: parseInt(row['Sum of TotalRatings'] || row.totalRatings || '0'),
        averageRating: parseFloat(row['Average of AverageRating'] || row.averageRating || '0'),
        bayesianAverage: parseFloat(row['Average of BayesianAverage'] || row.bayesianAverage || '0'),
        veryGoodCount: parseInt(row['Sum of RatingCounts: VeryGoodCount'] || row.veryGoodCount || '0'),
        goodCount: parseInt(row['Sum of RatingCounts: GoodCount'] || row.goodCount || '0'),
        acceptableCount: parseInt(row['Sum of RatingCounts: AcceptableCount'] || row.acceptableCount || '0'),
        badCount: parseInt(row['Sum of RatingCounts: BadCount'] || row.badCount || '0'),
        veryBadCount: parseInt(row['Sum of RatingCounts: VeryBadCount'] || row.veryBadCount || '0'),
      }));
    } catch (error) {
      console.error('[DailyChallengeAggregatorV2] Error fetching brand ratings:', error);
      return [];
    }
  }

  /**
   * Main aggregation method with trend scoring support
   */
  async aggregateForDate(
    dateString: string,
    options?: AggregationOptions
  ): Promise<DailyChallengeAggregationSummary> {
    const logger = options?.logger;
    const useTrendScoring = options?.useTrendScoring ?? true; // Default to new scoring

    await this.log('info', `Starting aggregation for ${dateString}`, { useTrendScoring }, logger);

    const db = await getDb();

    // Fetch orders from Metabase using Card 1267 (date-filtered)
    await this.log('info', `Fetching orders from Metabase for ${dateString}...`, undefined, logger);
    let orders: OrderRecord[] = [];
    
    try {
      // Try date-filtered card first (Card 1267)
      orders = await this.metabase.executeCardQuery(1267, { date: dateString }) as OrderRecord[];
      await this.log('info', `✓ Date-filtered query returned ${orders.length} orders`, undefined, logger);
    } catch (error) {
      // Fallback to Card 1266 with client-side filtering
      await this.log('warn', 'Date-filtered query failed, falling back to client-side filtering', error, logger);
      const allOrders = await this.metabase.executeCardQuery(1266);
      const targetDate = new Date(dateString);
      orders = allOrders.filter((order: any) => {
        if (!order.OrderDate) return false;
        const orderDate = new Date(order.OrderDate);
        return (
          orderDate.getFullYear() === targetDate.getFullYear() &&
          orderDate.getMonth() === targetDate.getMonth() &&
          orderDate.getDate() === targetDate.getDate()
        );
      }) as OrderRecord[];
      await this.log('info', `Filtered to ${orders.length} orders for ${dateString}`, undefined, logger);
    }

    await this.log('info', `Fetched ${orders.length} orders for ${dateString}`, undefined, logger);

    // Aggregate with trend scoring
    const manufacturers = await this.aggregateManufacturersWithTrends(db, dateString, orders, logger);
    const strains = await this.aggregateStrainsWithTrends(db, dateString, orders, logger);
    
    // Import and run pharmacy aggregation
    const { aggregatePharmaciesWithTrends } = await import('./aggregatePharmaciesV2');
    const pharmacies = await aggregatePharmaciesWithTrends(db, dateString, orders, logger, this.log.bind(this));
    
    // Import and run product aggregation
    const { aggregateProductsWithTrends } = await import('./aggregateProductsV2');
    const products = await aggregateProductsWithTrends(db, dateString, orders, logger, this.log.bind(this));
    
    // Aggregate brands using ported logic
    const brands = await this.aggregateBrands(db, dateString, orders, logger);

    return {
      statDate: dateString,
      totalOrders: orders.length,
      manufacturers,
      strains,
      products,
      pharmacies,
      brands,
    };
  }
}

// Singleton instance for easy import
export const dailyChallengeAggregatorV2 = new DailyChallengeAggregatorV2();
