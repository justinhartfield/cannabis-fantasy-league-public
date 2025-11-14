/**
 * Daily Challenge Aggregator
 * Aggregates raw order data from Metabase into daily challenge stats
 * and calculates scores using the daily challenge scoring engine
 */

import { db } from './_core/db';
import { getMetabaseClient } from './metabase';
import {
  calculateManufacturerScore,
  calculateStrainScore,
  calculatePharmacyScore,
  calculateBrandScore,
} from './dailyChallengeScoringEngine';

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
  async aggregateForDate(dateString: string): Promise<void> {
    console.log(`[DailyChallengeAggregator] Aggregating stats for ${dateString}...`);

    try {
      // Fetch orders from Metabase
      const orders = await this.fetchOrdersForDate(dateString);
      console.log(`[DailyChallengeAggregator] Found ${orders.length} orders for ${dateString}`);

      if (orders.length === 0) {
        console.log(`[DailyChallengeAggregator] No orders found for ${dateString}, skipping`);
        return;
      }

      // Aggregate and calculate scores for each entity type
      await Promise.all([
        this.aggregateManufacturers(dateString, orders),
        this.aggregateStrains(dateString, orders),
        this.aggregatePharmacies(dateString, orders),
        this.aggregateBrands(dateString, orders),
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

    // Query Metabase question 1264 (Orders by Day Full Detail)
    const allOrders = await this.metabase.executeCardQuery(1264);

    // Filter by date
    const targetDate = new Date(dateString);
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
  private async aggregateManufacturers(dateString: string, orders: OrderRecord[]): Promise<void> {
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
        .insert(db.schema.manufacturerDailyChallengeStats)
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
            db.schema.manufacturerDailyChallengeStats.manufacturerId,
            db.schema.manufacturerDailyChallengeStats.statDate,
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
  private async aggregateStrains(dateString: string, orders: OrderRecord[]): Promise<void> {
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
        .insert(db.schema.strainDailyChallengeStats)
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
          target: [db.schema.strainDailyChallengeStats.strainId, db.schema.strainDailyChallengeStats.statDate],
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
  private async aggregatePharmacies(dateString: string, orders: OrderRecord[]): Promise<void> {
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
        .insert(db.schema.pharmacyDailyChallengeStats)
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
          target: [db.schema.pharmacyDailyChallengeStats.pharmacyId, db.schema.pharmacyDailyChallengeStats.statDate],
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
  private async aggregateBrands(dateString: string, orders: OrderRecord[]): Promise<void> {
    console.log(`[DailyChallengeAggregator] Aggregating brands...`);

    const stats = new Map<string, { salesVolumeGrams: number; orderCount: number }>();

    for (const order of orders) {
      const name = order.ProductBrand;
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

      const brand = await db.query.brands.findFirst({
        where: (brands, { eq }) => eq(brands.name, name),
      });

      if (!brand) {
        console.log(`[DailyChallengeAggregator] Brand not found: ${name}`);
        continue;
      }

      const scoring = calculateBrandScore(data, rank);

      await db
        .insert(db.schema.brandDailyChallengeStats)
        .values({
          brandId: brand.id,
          statDate: dateString,
          salesVolumeGrams: data.salesVolumeGrams,
          orderCount: data.orderCount,
          totalPoints: scoring.totalPoints,
          rank,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [db.schema.brandDailyChallengeStats.brandId, db.schema.brandDailyChallengeStats.statDate],
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
}

// Export singleton instance
export const dailyChallengeAggregator = new DailyChallengeAggregator();
