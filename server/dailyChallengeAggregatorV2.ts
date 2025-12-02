/**
 * Daily Challenge Aggregator V2
 * Enhanced version with trend-based scoring integration
 * 
 * This aggregator fetches TrendMetrics data and uses the new trend-based scoring engine
 * while maintaining backward compatibility with the old scoring system.
 */

import { getDb } from './db';
import { getMetabaseClient } from './metabase';
import axios from 'axios';
// Old scoring functions removed - now using trend-based scoring exclusively
import {
  calculateManufacturerTrendScore,
  calculateStrainTrendScore,
  calculateProductTrendScore,
  calculatePharmacyTrendScore,
} from './trendScoringEngine';
import { pLimit } from './utils/concurrency';
import {
  fetchTotalMarketVolume,
  fetchTrendMetricsBatch,
  fetchTrendDataForScoring
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
import { eq, lt, sql } from 'drizzle-orm';

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
  pharmacyRelationships: EntityAggregationSummary;
};

type AggregationOptions = {
  logger?: AggregationLogger;
  useTrendScoring?: boolean; // Toggle between old and new scoring
  brandsOnly?: boolean;
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
   * Normalize manufacturer names to match database records
   * Handles known discrepancies between Metabase and DB
   */
  private normalizeManufacturerName(name: string): string {
    if (name === '187 Marry Jane') return '187 SWEEDZ';
    return name;
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
      const rawName = order.ProductManufacturer;
      if (!rawName) continue;

      const name = this.normalizeManufacturerName(rawName);

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

    // Prefetch data for optimization
    const allNames = sorted.map(([name]) => name);
    const [totalVolume, batchTrendMetrics] = await Promise.all([
      fetchTotalMarketVolume('productManufacturer'),
      fetchTrendMetricsBatch('productManufacturer', allNames)
    ]);

    let processed = 0;
    let skipped = 0;

    await pLimit(sorted, 20, async ([name, data], index) => {
      const rank = index + 1;

      // Find manufacturer in database
      const manufacturer = await db.query.manufacturers.findFirst({
        where: (manufacturers, { eq }) => eq(manufacturers.name, name),
      });

      if (!manufacturer) {
        skipped += 1;
        await this.log('warn', `Manufacturer not found: ${name}`, undefined, logger);
        return;
      }

      try {
        // Fetch trend data
        const trendData = await fetchTrendDataForScoring(
          'productManufacturer',
          name,
          manufacturer.id,
          dateString,
          rank,
          totalVolume,
          batchTrendMetrics.get(name)
        );

        // Calculate trend-based score
        // If trend data is missing, use precomputed neutral multiplier instead of bad fallback data
        const stats: TrendScoringStats = {
          orderCount: data.orderCount,
          // Only use trend data if it exists, otherwise let the scoring engine use neutral multiplier
          days1: trendData.trendMetrics?.days1,
          days7: trendData.trendMetrics?.days7,
          days14: trendData.trendMetrics?.days14,
          days30: trendData.trendMetrics?.days30,
          // Use neutral 1.0x multiplier when trend data is missing (prevents 5x hype bonus)
          trendMultiplier: trendData.trendMetrics ? undefined : 1.0,
          previousRank: trendData.previousRank,
          currentRank: rank,
          streakDays: trendData.streakDays,
          marketSharePercent: trendData.marketShare,
          dailyVolumes: trendData.dailyVolumes,
        };

        const trendScore = calculateManufacturerTrendScore(stats);
        // Safeguard: trendMultiplier should never be 0 (minimum is 1.0 for neutral)
        const safeTrendMultiplier = trendScore.trendMultiplier || 1.0;

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
            trendMultiplier: safeTrendMultiplier.toString(),
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
      } catch (error) {
        await this.log('error', `Error processing manufacturer ${name}:`, error, logger);
        skipped += 1;
      }
    });

    await this.log('info', `Processed ${processed} manufacturers, skipped ${skipped}`, undefined, logger);
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

    // Prefetch data for optimization
    const allNames = sorted.map(([name]) => name);
    const [totalVolume, batchTrendMetrics] = await Promise.all([
      fetchTotalMarketVolume('productStrainName'),
      fetchTrendMetricsBatch('productStrainName', allNames)
    ]);

    let processed = 0;
    let skipped = 0;

    await pLimit(sorted, 20, async ([name, data], index) => {
      const rank = index + 1;

      const strain = await db.query.cannabisStrains.findFirst({
        where: (cannabisStrains, { eq }) => eq(cannabisStrains.name, name),
      });

      if (!strain) {
        skipped += 1;
        return;
      }

      try {
        const trendData = await fetchTrendDataForScoring(
          'productStrainName',
          name,
          strain.id,
          dateString,
          rank,
          totalVolume,
          batchTrendMetrics.get(name)
        );

        // Calculate trend-based score
        // If trend data is missing, use precomputed neutral multiplier instead of bad fallback data
        const stats: TrendScoringStats = {
          orderCount: data.orderCount,
          // Only use trend data if it exists, otherwise let the scoring engine use neutral multiplier
          days1: trendData.trendMetrics?.days1,
          days7: trendData.trendMetrics?.days7,
          days14: trendData.trendMetrics?.days14,
          days30: trendData.trendMetrics?.days30,
          // Use neutral 1.0x multiplier when trend data is missing (prevents 5x hype bonus)
          trendMultiplier: trendData.trendMetrics ? undefined : 1.0,
          previousRank: trendData.previousRank,
          currentRank: rank,
          streakDays: trendData.streakDays,
          marketSharePercent: trendData.marketShare,
          dailyVolumes: trendData.dailyVolumes,
        };

        const trendScore = calculateStrainTrendScore(stats);

        // Safeguard: trendMultiplier should never be 0 (minimum is 1.0 for neutral)
        const safeTrendMultiplier = trendScore.trendMultiplier || 1.0;

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
            trendMultiplier: safeTrendMultiplier.toString(),
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
    });

    await this.log('info', `Processed ${processed} strains, skipped ${skipped}`, undefined, logger);
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
    // This now fetches both today and yesterday to compute deltas
    let ratingsData: Awaited<ReturnType<typeof this.fetchBrandRatings>>;
    try {
      ratingsData = await this.fetchBrandRatings(dateString);
    } catch (error) {
      await this.log('error', 'Failed to fetch brand ratings from Metabase', { error: error instanceof Error ? error.message : String(error) }, logger);
      // Don't delete existing stats if fetch failed - preserve existing data
      return { processed: 0, skipped: 0 };
    }

    // Only clear existing brand stats for this date if we have new data to insert
    // This prevents losing data if the API returns empty temporarily
    if (!ratingsData || ratingsData.length === 0) {
      await this.log('warn', 'No brand ratings data found - preserving existing stats for this date', undefined, logger);
      return { processed: 0, skipped: 0 };
    }

    // Clear existing brand stats for this date before inserting new data
    await db.delete(brandDailyChallengeStats).where(eq(brandDailyChallengeStats.statDate, dateString));

    // Sort by total ratings (engagement) to determine rank
    const sorted = ratingsData
      .filter(b => b.totalRatings > 0) // Only include brands with ratings
      .sort((a, b) => b.totalRatings - a.totalRatings);

    let processed = 0;
    let skipped = 0;

    await pLimit(sorted, 20, async (brandData, index) => {
      const rank = index + 1;

      const brand = await db.query.brands.findFirst({
        where: (brands, { eq }) => eq(brands.name, brandData.name),
      });

      if (!brand) {
        skipped += 1;
        await this.log('warn', `Brand not found in DB: ${brandData.name}`, undefined, logger);
        return;
      }

      // Deltas are now computed from the two Metabase cards
      const ratingDelta = brandData.ratingDelta;
      const bayesianDelta = brandData.bayesianDelta;

      const scoring = calculateDailyBrandScore({
        totalRatings: brandData.totalRatings,
        averageRating: brandData.averageRating,
        bayesianAverage: brandData.bayesianAverage,
        veryGoodCount: brandData.veryGoodCount,
        goodCount: brandData.goodCount,
        acceptableCount: brandData.acceptableCount,
        badCount: brandData.badCount,
        veryBadCount: brandData.veryBadCount,
        ratingDelta,
        bayesianDelta,
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
          ratingDelta,
          bayesianDelta: bayesianDelta.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }); // No need for onConflictDoUpdate since we deleted beforehand

      processed += 1;
    });

    await this.log('info', `Processed ${processed} brands, skipped ${skipped}`, undefined, logger);
    return { processed, skipped };
  }

  private async getPreviousBrandSnapshot(
    db: Database,
    statDate: string
  ): Promise<
    Map<
      number,
      {
        brandId: number;
        totalRatings: number;
        bayesianAverage: string | null;
        rank: number | null;
      }
    >
  > {
    const previousDateResult = await db
      .select({
        date: sql<string | null>`max(${brandDailyChallengeStats.statDate})`,
      })
      .from(brandDailyChallengeStats)
      .where(lt(brandDailyChallengeStats.statDate, statDate))
      .limit(1);

    const previousDate = previousDateResult[0]?.date;
    if (!previousDate) {
      return new Map();
    }

    const previousStats = await db
      .select({
        brandId: brandDailyChallengeStats.brandId,
        totalRatings: brandDailyChallengeStats.totalRatings,
        bayesianAverage: brandDailyChallengeStats.bayesianAverage,
        rank: brandDailyChallengeStats.rank,
      })
      .from(brandDailyChallengeStats)
      .where(eq(brandDailyChallengeStats.statDate, previousDate));

    return new Map(previousStats.map((stat) => [stat.brandId, stat]));
  }

  /**
   * Helper to get a field value case-insensitively
   */
  private getFieldCaseInsensitive(row: Record<string, any>, fieldName: string): any {
    // Try exact match first
    if (row[fieldName] !== undefined) return row[fieldName];
    
    // Try lowercase
    const lowerField = fieldName.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lowerField) {
        return row[key];
      }
    }
    
    // Try snake_case
    const snakeField = fieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === snakeField) {
        return row[key];
      }
    }
    
    return undefined;
  }

  /**
   * Fetch brand ratings from Metabase
   * Uses the public questions for Today's ratings
   */
  private async fetchBrandRatings(statDate: string): Promise<Array<{
    name: string;
    totalRatings: number;
    averageRating: number;
    bayesianAverage: number;
    veryGoodCount: number;
    goodCount: number;
    acceptableCount: number;
    badCount: number;
    veryBadCount: number;
    ratingDelta: number;
    bayesianDelta: number;
  }>> {
    try {
      // Public UUIDs provided by user
      const TODAY_UUID = '4468dfb0-8031-4e99-9115-0c31bd9373bb';
      // const YESTERDAY_UUID = '14245995-f016-442b-ae44-2fbee6b3828b'; // Not using yesterday for scoring anymore, focused on TODAY

      console.log(`[Brand Ratings] Fetching public data for TODAY (${statDate})...`);

      // Fetch raw rows from public query
      const rawRows = await this.metabase.executePublicQuery(TODAY_UUID);

      console.log(`[Brand Ratings] Fetched ${rawRows.length} raw rating rows`);

      if (!rawRows || rawRows.length === 0) {
        console.warn(`[Brand Ratings] No ratings found for today.`);
        return [];
      }

      // Log first row's keys to help debug field name issues
      if (rawRows.length > 0) {
        console.log(`[Brand Ratings] First row keys: ${Object.keys(rawRows[0]).join(', ')}`);
        console.log(`[Brand Ratings] Sample row:`, JSON.stringify(rawRows[0]).substring(0, 500));
      }

      // Aggregate rows by Brand (TargetName)
      const brandStats = new Map<string, {
        count: number;
        sumRating: number;
        ratings: number[];
      }>();

      let brandRowCount = 0;
      let skippedRows = 0;

      for (const row of rawRows) {
        // Check if the row is for a Brand (case-insensitive field lookup)
        const reviewType = this.getFieldCaseInsensitive(row, 'ReviewType');
        const reviewTypeLower = String(reviewType || '').toLowerCase();
        
        if (reviewTypeLower !== 'brand') {
          skippedRows++;
          continue;
        }

        brandRowCount++;

        // Get brand name (case-insensitive)
        const brandName = this.getFieldCaseInsensitive(row, 'TargetName') || 
                          this.getFieldCaseInsensitive(row, 'BrandName') ||
                          this.getFieldCaseInsensitive(row, 'Name');
        if (!brandName) continue;

        const rating = Number(this.getFieldCaseInsensitive(row, 'Rating')) || 0;

        if (!brandStats.has(brandName)) {
          brandStats.set(brandName, { count: 0, sumRating: 0, ratings: [] });
        }

        const stats = brandStats.get(brandName)!;
        stats.count++;
        stats.sumRating += rating;
        stats.ratings.push(rating);
      }

      console.log(`[Brand Ratings] Found ${brandRowCount} brand rows out of ${rawRows.length} total (skipped ${skippedRows} non-brand rows)`);

      // Convert map to array
      const results = Array.from(brandStats.entries()).map(([name, stats]) => {
        const averageRating = stats.count > 0 ? stats.sumRating / stats.count : 0;

        // Calculate distribution
        const veryGoodCount = stats.ratings.filter(r => r >= 5).length;
        const goodCount = stats.ratings.filter(r => r === 4).length;
        const acceptableCount = stats.ratings.filter(r => r === 3).length;
        const badCount = stats.ratings.filter(r => r === 2).length;
        const veryBadCount = stats.ratings.filter(r => r <= 1).length;

        return {
          name,
          totalRatings: stats.count, // This is "Today's Count"
          averageRating,
          bayesianAverage: averageRating, // Using simple average for now as we reset daily
          veryGoodCount,
          goodCount,
          acceptableCount,
          badCount,
          veryBadCount,
          ratingDelta: 0, // Not relevant for "Today only" scoring
          bayesianDelta: 0,
        };
      });

      console.log(`[Brand Ratings] Aggregated into ${results.length} brands`);
      return results;
    } catch (error) {
      console.error('[DailyChallengeAggregatorV2] Error fetching brand ratings:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('[Brand Ratings] API error details:', error.response.data);
      }
      // Re-throw error instead of silently failing so it's visible in job logs
      throw error;
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
    if (!db) {
      throw new Error('Database not available');
    }

    // Fetch orders from Metabase using Card 1267 (date-filtered)
    let orders: OrderRecord[] = [];

    if (!options?.brandsOnly) {
      await this.log('info', `Fetching orders from Metabase for ${dateString}...`, undefined, logger);
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
    } else {
      await this.log('info', `Skipping order fetch (brandsOnly mode)`, undefined, logger);
    }

    // Aggregate with trend scoring
    const [manufacturers, strains, pharmacies, products, brands, pharmacyRelationships] = await Promise.all([
      options?.brandsOnly ? { processed: 0, skipped: 0 } : this.aggregateManufacturersWithTrends(db, dateString, orders, logger),
      options?.brandsOnly ? { processed: 0, skipped: 0 } : this.aggregateStrainsWithTrends(db, dateString, orders, logger),
      options?.brandsOnly ? Promise.resolve({ processed: 0, skipped: 0 }) : import('./aggregatePharmaciesV2').then(({ aggregatePharmaciesWithTrends }) =>
        aggregatePharmaciesWithTrends(db, dateString, orders, logger, this.log.bind(this))
      ),
      options?.brandsOnly ? Promise.resolve({ processed: 0, skipped: 0 }) : import('./aggregateProductsV2').then(({ aggregateProductsWithTrends }) =>
        aggregateProductsWithTrends(db, dateString, orders, logger, this.log.bind(this))
      ),
      this.aggregateBrands(db, dateString, orders, logger),
      // Aggregate pharmacy-product relationships for synergy bonuses
      options?.brandsOnly ? Promise.resolve({ processed: 0, skipped: 0 }) : import('./lib/metabase-pharmacy-relationships').then(({ aggregatePharmacyProductRelationships }) =>
        aggregatePharmacyProductRelationships(dateString, orders, logger)
      ),
    ]);

    return {
      statDate: dateString,
      totalOrders: orders.length,
      manufacturers,
      strains,
      products,
      pharmacies,
      brands,
      pharmacyRelationships,
    };
  }
}

// Singleton instance for easy import
export const dailyChallengeAggregatorV2 = new DailyChallengeAggregatorV2();
