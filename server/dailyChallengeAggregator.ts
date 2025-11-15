/**
 * Daily Challenge Aggregator
 * Aggregates raw order data from Metabase into daily challenge stats
 * and calculates scores using the daily challenge scoring engine
 */

import { getDb } from './db';
import { getMetabaseClient } from './metabase';
import {
  calculateManufacturerScore,
  calculateStrainScore,
  calculatePharmacyScore,
  calculateBrandScore,
} from './dailyChallengeScoringEngine';
import {
  manufacturerDailyChallengeStats,
  strainDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats,
} from '../drizzle/dailyChallengeSchema';

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
  pharmacies: EntityAggregationSummary;
  brands: EntityAggregationSummary;
};

type AggregationOptions = {
  logger?: AggregationLogger;
};

export class DailyChallengeAggregator {
  private metabase = getMetabaseClient();

  private async log(
    level: 'info' | 'warn' | 'error',
    message: string,
    metadata?: Record<string, unknown> | unknown,
    logger?: AggregationLogger
  ) {
    const prefix = '[DailyChallengeAggregator]';
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
   * Aggregate daily challenge stats for a specific date
   */
  async aggregateForDate(dateString: string, options?: AggregationOptions): Promise<DailyChallengeAggregationSummary> {
    const logger = options?.logger;

    try {
      await this.log('info', `Starting aggregation for ${dateString}...`, undefined, logger);

      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const orders = await this.fetchOrdersForDate(dateString, logger);
      await this.log('info', `Found ${orders.length} orders for ${dateString}`, undefined, logger);

      const summary: DailyChallengeAggregationSummary = {
        statDate: dateString,
        totalOrders: orders.length,
        manufacturers: { processed: 0, skipped: 0 },
        strains: { processed: 0, skipped: 0 },
        pharmacies: { processed: 0, skipped: 0 },
        brands: { processed: 0, skipped: 0 },
      };

      if (orders.length === 0) {
        await this.log('warn', `No orders found for ${dateString}, skipping`, undefined, logger);
        return summary;
      }

      const [manufacturerResult, strainResult, pharmacyResult, brandResult] = await Promise.all([
        this.aggregateManufacturers(db, dateString, orders, logger),
        this.aggregateStrains(db, dateString, orders, logger),
        this.aggregatePharmacies(db, dateString, orders, logger),
        this.aggregateBrands(db, dateString, orders, logger),
      ]);

      summary.manufacturers = manufacturerResult;
      summary.strains = strainResult;
      summary.pharmacies = pharmacyResult;
      summary.brands = brandResult;

      await this.log('info', `✅ Aggregation complete for ${dateString}`, summary, logger);
      return summary;
    } catch (error) {
      await this.log('error', `Error aggregating stats for ${dateString}`, {
        error: error instanceof Error ? error.message : String(error),
      }, logger);
      throw error;
    }
  }

  /**
   * Fetch orders for a specific date from Metabase
   */
  private async fetchOrdersForDate(dateString: string, logger?: AggregationLogger): Promise<OrderRecord[]> {
    await this.log('info', 'Fetching orders from Metabase...', undefined, logger);

    // Query Metabase question 1266 (TODAY Completed transactions with recent data)
    const allOrders = await this.metabase.executeCardQuery(1266);

    // Filter by date
    const targetDate = new Date(dateString);
    await this.log(
      'info',
      `Target date: ${targetDate.toISOString()}, year=${targetDate.getFullYear()}, month=${targetDate.getMonth()}, day=${targetDate.getDate()}`,
      undefined,
      logger
    );
    await this.log(
      'info',
      'First 3 order dates sample',
      allOrders.slice(0, 3).map((o: any) => ({ OrderDate: o.OrderDate, UpdatedAt: o.UpdatedAt })),
      logger
    );
    const filtered = allOrders.filter((order: any) => {
      if (!order.UpdatedAt) return false;
      const updatedDate = new Date(order.UpdatedAt);
      return (
        updatedDate.getFullYear() === targetDate.getFullYear() &&
        updatedDate.getMonth() === targetDate.getMonth() &&
        updatedDate.getDate() === targetDate.getDate()
      );
    });

    await this.log('info', `Filtered to ${filtered.length} orders for ${dateString}`, undefined, logger);
    return filtered as OrderRecord[];
  }

  /**
   * Aggregate manufacturer stats and calculate scores
   */
  private async aggregateManufacturers(
    db: Database,
    dateString: string,
    orders: OrderRecord[],
    logger?: AggregationLogger
  ): Promise<EntityAggregationSummary> {
    await this.log('info', 'Aggregating manufacturers...', undefined, logger);

    // Group by manufacturer
    const stats = new Map<string, { salesVolumeGrams: number; orderCount: number; revenueCents: number }>();

    for (const order of orders) {
      const name = order.ProductManufacturer;
      if (!name) continue;

      const quantity = order.Quantity || 0;
      const revenue = (order.TotalPrice || 0) * 100; // Convert to cents

      const current = stats.get(name) || { salesVolumeGrams: 0, orderCount: 0, revenueCents: 0 };
      current.salesVolumeGrams += quantity;
      current.orderCount += 1;
      current.revenueCents += revenue;
      stats.set(name, current);
    }

    const sorted = Array.from(stats.entries()).sort((a, b) => b[1].salesVolumeGrams - a[1].salesVolumeGrams);
    await this.log('info', `Found ${stats.size} unique manufacturers in orders`, undefined, logger);
    await this.log(
      'info',
      'Top 3 manufacturers',
      Array.from(stats.entries())
        .slice(0, 3)
        .map(([name, data]) => ({ name, ...data })),
      logger
    );

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

      // Calculate score
      const scoring = calculateManufacturerScore(data, rank);

      // Upsert stats
      await db
        .insert(manufacturerDailyChallengeStats)
        .values({
          manufacturerId: manufacturer.id,
          statDate: dateString,
          salesVolumeGrams: data.salesVolumeGrams,
          orderCount: data.orderCount,
          revenueCents: data.revenueCents,
          totalPoints: scoring.totalPoints,
          rank,
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
            totalPoints: scoring.totalPoints,
            rank,
            updatedAt: new Date(),
          },
        });

      processed += 1;

      await this.log(
        'info',
        `${name}: ${data.salesVolumeGrams}g, ${data.orderCount} orders, ${scoring.totalPoints} pts (rank #${rank})`,
        undefined,
        logger
      );
    }

    return { processed, skipped };
  }

  /**
   * Aggregate strain stats and calculate scores
   */
  private async aggregateStrains(
    db: Database,
    dateString: string,
    orders: OrderRecord[],
    logger?: AggregationLogger
  ): Promise<EntityAggregationSummary> {
    await this.log('info', 'Aggregating strains...', undefined, logger);

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

      const strain = await db.query.strains.findFirst({
        where: (strains, { eq }) => eq(strains.name, name),
      });

      if (!strain) {
        skipped += 1;
        await this.log('warn', `Strain not found: ${name}`, undefined, logger);
        continue;
      }

      const scoring = calculateStrainScore(data, rank);

      await db
        .insert(strainDailyChallengeStats)
        .values({
          strainId: strain.id,
          statDate: dateString,
          salesVolumeGrams: data.salesVolumeGrams,
          orderCount: data.orderCount,
          totalPoints: scoring.totalPoints,
          rank,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [strainDailyChallengeStats.strainId, strainDailyChallengeStats.statDate],
          set: {
            salesVolumeGrams: data.salesVolumeGrams,
            orderCount: data.orderCount,
            totalPoints: scoring.totalPoints,
            rank,
            updatedAt: new Date(),
          },
        });

      processed += 1;
      await this.log(
        'info',
        `${name}: ${data.salesVolumeGrams}g, ${scoring.totalPoints} pts (rank #${rank})`,
        undefined,
        logger
      );
    }

    return { processed, skipped };
  }

  /**
   * Aggregate pharmacy stats and calculate scores
   */
  private async aggregatePharmacies(
    db: Database,
    dateString: string,
    orders: OrderRecord[],
    logger?: AggregationLogger
  ): Promise<EntityAggregationSummary> {
    await this.log('info', 'Aggregating pharmacies...', undefined, logger);

    const stats = new Map<string, { orderCount: number; revenueCents: number }>();

    for (const order of orders) {
      const name = order.PharmacyName;
      if (!name) continue;

      const revenue = (order.TotalPrice || 0) * 100;

      const current = stats.get(name) || { orderCount: 0, revenueCents: 0 };
      current.orderCount += 1;
      current.revenueCents += revenue;
      stats.set(name, current);
    }

    const sorted = Array.from(stats.entries()).sort((a, b) => b[1].revenueCents - a[1].revenueCents);

    let processed = 0;
    let skipped = 0;

    for (let i = 0; i < sorted.length; i++) {
      const [name, data] = sorted[i];
      const rank = i + 1;

      const pharmacy = await db.query.pharmacies.findFirst({
        where: (pharmacies, { eq }) => eq(pharmacies.name, name),
      });

      if (!pharmacy) {
        skipped += 1;
        await this.log('warn', `Pharmacy not found: ${name}`, undefined, logger);
        continue;
      }

      const scoring = calculatePharmacyScore(data, rank);

      await db
        .insert(pharmacyDailyChallengeStats)
        .values({
          pharmacyId: pharmacy.id,
          statDate: dateString,
          orderCount: data.orderCount,
          revenueCents: data.revenueCents,
          totalPoints: scoring.totalPoints,
          rank,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [pharmacyDailyChallengeStats.pharmacyId, pharmacyDailyChallengeStats.statDate],
          set: {
            orderCount: data.orderCount,
            revenueCents: data.revenueCents,
            totalPoints: scoring.totalPoints,
            rank,
            updatedAt: new Date(),
          },
        });

      processed += 1;
      await this.log(
        'info',
        `${name}: ${data.orderCount} orders, ${scoring.totalPoints} pts (rank #${rank})`,
        undefined,
        logger
      );
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

      const scoring = calculateBrandScore({
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
      console.error('[DailyChallengeAggregator] Error fetching brand ratings:', error);
      return [];
    }
  }
}

// Export singleton instance
export const dailyChallengeAggregator = new DailyChallengeAggregator();
