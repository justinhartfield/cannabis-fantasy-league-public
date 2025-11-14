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

export class DailyChallengeAggregator {
  private metabase = getMetabaseClient();

  /**
   * Aggregate daily challenge stats for a specific date
   */
  async aggregateForDate(dateString: string) {
    try {
      console.log(`[DailyChallengeAggregator] Starting aggregation for ${dateString}...`);

      const db = await getDb();

      // Fetch orders from Metabase
      const orders = await this.fetchOrdersForDate(dateString);
      console.log(`[DailyChallengeAggregator] Found ${orders.length} orders for ${dateString}`);

      if (orders.length === 0) {
        console.log(`[DailyChallengeAggregator] No orders found for ${dateString}, skipping`);
        return;
      }

      // Aggregate and calculate scores for each entity type
      await Promise.all([
        this.aggregateManufacturers(db, dateString, orders),
        this.aggregateStrains(db, dateString, orders),
        this.aggregatePharmacies(db, dateString, orders),
        this.aggregateBrands(db, dateString, orders),
      ]);

      console.log(`[DailyChallengeAggregator] ✅ Aggregation complete for ${dateString}`);
    } catch (error) {
      console.error(`[DailyChallengeAggregator] Error aggregating stats for ${dateString}:`, error);
      throw error;
    }
  }

  /**
   * Fetch orders for a specific date from Metabase
   */
  private async fetchOrdersForDate(dateString: string): Promise<OrderRecord[]> {
    console.log(`[DailyChallengeAggregator] Fetching orders from Metabase...`);

    // Query Metabase question 1266 (TODAY Completed transactions with recent data)
    const allOrders = await this.metabase.executeCardQuery(1266);

    // Filter by date
    const targetDate = new Date(dateString);
    console.log(`[DailyChallengeAggregator] Target date: ${targetDate.toISOString()}, year=${targetDate.getFullYear()}, month=${targetDate.getMonth()}, day=${targetDate.getDate()}`);
    console.log(`[DailyChallengeAggregator] First 3 order dates:`, allOrders.slice(0, 3).map((o: any) => o.OrderDate));
    const filtered = allOrders.filter((order: any) => {
      if (!order.OrderDate) return false;
      const orderDate = new Date(order.OrderDate);
      return (
        orderDate.getFullYear() === targetDate.getFullYear() &&
        orderDate.getMonth() === targetDate.getMonth() &&
        orderDate.getDate() === targetDate.getDate()
      );
    });

    console.log(`[DailyChallengeAggregator] Filtered to ${filtered.length} orders for ${dateString}`);
    return filtered as OrderRecord[];
  }

  /**
   * Aggregate manufacturer stats and calculate scores
   */
  private async aggregateManufacturers(db: ReturnType<typeof getDb>, dateString: string, orders: OrderRecord[]): Promise<void> {
    console.log(`[DailyChallengeAggregator] Aggregating manufacturers...`);

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

    // Sort by sales volume to determine ranks
    const sorted = Array.from(stats.entries()).sort((a, b) => b[1].salesVolumeGrams - a[1].salesVolumeGrams);
    console.log(`[DailyChallengeAggregator] Found ${stats.size} unique manufacturers in orders`);
    console.log(`[DailyChallengeAggregator] Top 3 manufacturers:`, Array.from(stats.entries()).slice(0, 3).map(([name, data]) => ({ name, ...data })));

    // Save to database with calculated scores
    for (let i = 0; i < sorted.length; i++) {
      const [name, data] = sorted[i];
      const rank = i + 1;

      // Find manufacturer in database
      const manufacturer = await db.query.manufacturers.findFirst({
        where: (manufacturers, { eq }) => eq(manufacturers.name, name),
      });

      if (!manufacturer) {
        console.log(`[DailyChallengeAggregator] Manufacturer not found: ${name}`);
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

      console.log(
        `[DailyChallengeAggregator] ${name}: ${data.salesVolumeGrams}g, ${data.orderCount} orders, ${scoring.totalPoints} pts (rank #${rank})`
      );
    }
  }

  /**
   * Aggregate strain stats and calculate scores
   */
  private async aggregateStrains(db: ReturnType<typeof getDb>, dateString: string, orders: OrderRecord[]): Promise<void> {
    console.log(`[DailyChallengeAggregator] Aggregating strains...`);

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

    for (let i = 0; i < sorted.length; i++) {
      const [name, data] = sorted[i];
      const rank = i + 1;

      const strain = await db.query.strains.findFirst({
        where: (strains, { eq }) => eq(strains.name, name),
      });

      if (!strain) {
        console.log(`[DailyChallengeAggregator] Strain not found: ${name}`);
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

      console.log(`[DailyChallengeAggregator] ${name}: ${data.salesVolumeGrams}g, ${scoring.totalPoints} pts (rank #${rank})`);
    }
  }

  /**
   * Aggregate pharmacy stats and calculate scores
   */
  private async aggregatePharmacies(db: ReturnType<typeof getDb>, dateString: string, orders: OrderRecord[]): Promise<void> {
    console.log(`[DailyChallengeAggregator] Aggregating pharmacies...`);

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

    for (let i = 0; i < sorted.length; i++) {
      const [name, data] = sorted[i];
      const rank = i + 1;

      const pharmacy = await db.query.pharmacies.findFirst({
        where: (pharmacies, { eq }) => eq(pharmacies.name, name),
      });

      if (!pharmacy) {
        console.log(`[DailyChallengeAggregator] Pharmacy not found: ${name}`);
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

      console.log(`[DailyChallengeAggregator] ${name}: ${data.orderCount} orders, ${scoring.totalPoints} pts (rank #${rank})`);
    }
  }

  /**
   * Aggregate brand stats and calculate scores
   */
  private async aggregateBrands(db: ReturnType<typeof getDb>, dateString: string, orders: OrderRecord[]): Promise<void> {
    console.log(`[DailyChallengeAggregator] Aggregating brands from ratings data...`);

    // Brands use ratings data, not order data
    // Fetch from Metabase question that aggregates brand ratings
    // Note: The ratings are cumulative, not daily, so we use the latest snapshot
    const ratingsData = await this.fetchBrandRatings();
    
    if (!ratingsData || ratingsData.length === 0) {
      console.log(`[DailyChallengeAggregator] No brand ratings data found`);
      return;
    }

    // Sort by total ratings (engagement) to determine rank
    const sorted = ratingsData
      .filter(b => b.totalRatings > 0) // Only include brands with ratings
      .sort((a, b) => b.totalRatings - a.totalRatings);

    for (let i = 0; i < sorted.length; i++) {
      const brandData = sorted[i];
      const rank = i + 1;

      const brand = await db.query.brands.findFirst({
        where: (brands, { eq }) => eq(brands.name, brandData.name),
      });

      if (!brand) {
        console.log(`[DailyChallengeAggregator] Brand not found in DB: ${brandData.name}`);
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

      console.log(`[DailyChallengeAggregator] ${brandData.name}: ${brandData.totalRatings} ratings, avg ${brandData.averageRating}, ${scoring.totalPoints} pts (rank #${rank})`);
    }
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
