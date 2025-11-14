/**
 * Daily Stats Aggregator v2
 * Uses Metabase Question 1264 (Orders by Day Full Detail) for aggregation
 */

import { db } from './_core/db';
import { getMetabaseClient } from './metabase';

interface OrderRecord {
  ID: string;
  Status: string;
  OrderDate: string; // "Nov 7, 2024, 14:51"
  Quantity: string; // "10"
  TotalPrice: string; // "114,9" (German number format)
  ProductManufacturer: string;
  ProductStrainName: string;
  PharmacyName: string;
  Product: string; // Product ID
  Pharmacy: string; // Pharmacy ID
}

export class DailyStatsAggregatorV2 {
  private metabase = getMetabaseClient();

  /**
   * Aggregate daily stats for a specific date
   */
  async aggregateForDate(dateString: string): Promise<void> {
    console.log(`[DailyStatsAggregator] Aggregating stats for ${dateString}...`);

    try {
      // Fetch orders from Metabase question 1264
      const orders = await this.fetchOrdersForDate(dateString);
      console.log(`[DailyStatsAggregator] Found ${orders.length} orders for ${dateString}`);

      if (orders.length === 0) {
        console.log(`[DailyStatsAggregator] No orders found for ${dateString}, skipping aggregation`);
        return;
      }

      // Aggregate stats by entity type
      await Promise.all([
        this.aggregateManufacturerStats(dateString, orders),
        this.aggregateStrainStats(dateString, orders),
        this.aggregatePharmacyStats(dateString, orders),
        this.aggregateProductStats(dateString, orders),
      ]);

      console.log(`[DailyStatsAggregator] ✅ Aggregation complete for ${dateString}`);
    } catch (error) {
      console.error(`[DailyStatsAggregator] Error aggregating stats for ${dateString}:`, error);
      throw error;
    }
  }

  /**
   * Fetch orders for a specific date from Metabase
   */
  private async fetchOrdersForDate(dateString: string): Promise<OrderRecord[]> {
    console.log(`[DailyStatsAggregator] Fetching orders from Metabase for ${dateString}...`);

    // Query Metabase question 1264 with date filter
    // The question ID is 1264, we need to use the card endpoint
    const result = await this.metabase.executeCardQuery(1264, {
      // Add date filter parameters if the question supports them
      // For now, fetch all and filter client-side
    });

    // Filter orders by date (client-side for now)
    const targetDate = new Date(dateString);
    const filtered = result.filter((order: any) => {
      if (!order.OrderDate) return false;
      
      // Parse "Nov 7, 2024, 14:51" format
      const orderDate = new Date(order.OrderDate);
      return (
        orderDate.getFullYear() === targetDate.getFullYear() &&
        orderDate.getMonth() === targetDate.getMonth() &&
        orderDate.getDate() === targetDate.getDate()
      );
    });

    console.log(`[DailyStatsAggregator] Filtered to ${filtered.length} orders for ${dateString}`);
    return filtered as OrderRecord[];
  }

  /**
   * Aggregate manufacturer daily stats
   */
  private async aggregateManufacturerStats(dateString: string, orders: OrderRecord[]): Promise<void> {
    console.log(`[DailyStatsAggregator] Aggregating manufacturer stats...`);

    // Group orders by manufacturer
    const manufacturerStats = new Map<string, { totalQuantity: number; orderCount: number; revenue: number }>();

    for (const order of orders) {
      const manufacturer = order.ProductManufacturer;
      if (!manufacturer) continue;

      const quantity = parseInt(order.Quantity) || 0;
      const revenue = this.parseGermanNumber(order.TotalPrice);

      const stats = manufacturerStats.get(manufacturer) || { totalQuantity: 0, orderCount: 0, revenue: 0 };
      stats.totalQuantity += quantity;
      stats.orderCount += 1;
      stats.revenue += revenue;
      manufacturerStats.set(manufacturer, stats);
    }

    // Save to database
    for (const [manufacturerName, stats] of manufacturerStats.entries()) {
      // Find manufacturer ID by name
      const manufacturer = await db.query.manufacturers.findFirst({
        where: (manufacturers, { eq }) => eq(manufacturers.name, manufacturerName),
      });

      if (!manufacturer) {
        console.log(`[DailyStatsAggregator] Manufacturer not found: ${manufacturerName}`);
        continue;
      }

      // Upsert daily stats
      await db
        .insert(db.schema.manufacturerDailyStats)
        .values({
          manufacturerId: manufacturer.id,
          statDate: dateString,
          salesVolume: stats.totalQuantity,
          orderCount: stats.orderCount,
          revenue: stats.revenue,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [db.schema.manufacturerDailyStats.manufacturerId, db.schema.manufacturerDailyStats.statDate],
          set: {
            salesVolume: stats.totalQuantity,
            orderCount: stats.orderCount,
            revenue: stats.revenue,
            updatedAt: new Date(),
          },
        });

      console.log(`[DailyStatsAggregator] Saved manufacturer stats: ${manufacturerName} - ${stats.totalQuantity} units, ${stats.orderCount} orders`);
    }
  }

  /**
   * Aggregate strain daily stats
   */
  private async aggregateStrainStats(dateString: string, orders: OrderRecord[]): Promise<void> {
    console.log(`[DailyStatsAggregator] Aggregating strain stats...`);

    const strainStats = new Map<string, { totalQuantity: number; orderCount: number }>();

    for (const order of orders) {
      const strainName = order.ProductStrainName;
      if (!strainName) continue;

      const quantity = parseInt(order.Quantity) || 0;

      const stats = strainStats.get(strainName) || { totalQuantity: 0, orderCount: 0 };
      stats.totalQuantity += quantity;
      stats.orderCount += 1;
      strainStats.set(strainName, stats);
    }

    for (const [strainName, stats] of strainStats.entries()) {
      const strain = await db.query.strains.findFirst({
        where: (strains, { eq }) => eq(strains.name, strainName),
      });

      if (!strain) {
        console.log(`[DailyStatsAggregator] Strain not found: ${strainName}`);
        continue;
      }

      await db
        .insert(db.schema.strainDailyStats)
        .values({
          strainId: strain.id,
          statDate: dateString,
          salesVolume: stats.totalQuantity,
          orderCount: stats.orderCount,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [db.schema.strainDailyStats.strainId, db.schema.strainDailyStats.statDate],
          set: {
            salesVolume: stats.totalQuantity,
            orderCount: stats.orderCount,
            updatedAt: new Date(),
          },
        });

      console.log(`[DailyStatsAggregator] Saved strain stats: ${strainName} - ${stats.totalQuantity} units`);
    }
  }

  /**
   * Aggregate pharmacy daily stats
   */
  private async aggregatePharmacyStats(dateString: string, orders: OrderRecord[]): Promise<void> {
    console.log(`[DailyStatsAggregator] Aggregating pharmacy stats...`);

    const pharmacyStats = new Map<string, { orderCount: number; revenue: number }>();

    for (const order of orders) {
      const pharmacyName = order.PharmacyName;
      if (!pharmacyName) continue;

      const revenue = this.parseGermanNumber(order.TotalPrice);

      const stats = pharmacyStats.get(pharmacyName) || { orderCount: 0, revenue: 0 };
      stats.orderCount += 1;
      stats.revenue += revenue;
      pharmacyStats.set(pharmacyName, stats);
    }

    for (const [pharmacyName, stats] of pharmacyStats.entries()) {
      const pharmacy = await db.query.pharmacies.findFirst({
        where: (pharmacies, { eq }) => eq(pharmacies.name, pharmacyName),
      });

      if (!pharmacy) {
        console.log(`[DailyStatsAggregator] Pharmacy not found: ${pharmacyName}`);
        continue;
      }

      await db
        .insert(db.schema.pharmacyDailyStats)
        .values({
          pharmacyId: pharmacy.id,
          statDate: dateString,
          orderCount: stats.orderCount,
          revenue: stats.revenue,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [db.schema.pharmacyDailyStats.pharmacyId, db.schema.pharmacyDailyStats.statDate],
          set: {
            orderCount: stats.orderCount,
            revenue: stats.revenue,
            updatedAt: new Date(),
          },
        });

      console.log(`[DailyStatsAggregator] Saved pharmacy stats: ${pharmacyName} - ${stats.orderCount} orders`);
    }
  }

  /**
   * Aggregate product daily stats
   */
  private async aggregateProductStats(dateString: string, orders: OrderRecord[]): Promise<void> {
    console.log(`[DailyStatsAggregator] Aggregating product stats...`);

    const productStats = new Map<string, { totalQuantity: number; orderCount: number }>();

    for (const order of orders) {
      const productId = order.Product;
      if (!productId) continue;

      const quantity = parseInt(order.Quantity) || 0;

      const stats = productStats.get(productId) || { totalQuantity: 0, orderCount: 0 };
      stats.totalQuantity += quantity;
      stats.orderCount += 1;
      productStats.set(productId, stats);
    }

    for (const [metabaseProductId, stats] of productStats.entries()) {
      // Find product by metabaseId
      const product = await db.query.products.findFirst({
        where: (products, { eq }) => eq(products.metabaseId, metabaseProductId),
      });

      if (!product) {
        console.log(`[DailyStatsAggregator] Product not found: ${metabaseProductId}`);
        continue;
      }

      await db
        .insert(db.schema.productDailyStats)
        .values({
          productId: product.id,
          statDate: dateString,
          salesVolume: stats.totalQuantity,
          orderCount: stats.orderCount,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [db.schema.productDailyStats.productId, db.schema.productDailyStats.statDate],
          set: {
            salesVolume: stats.totalQuantity,
            orderCount: stats.orderCount,
            updatedAt: new Date(),
          },
        });

      console.log(`[DailyStatsAggregator] Saved product stats: ${product.name} - ${stats.totalQuantity} units`);
    }
  }

  /**
   * Parse German number format (e.g., "114,9" -> 114.9)
   * Also handles numbers directly from Metabase API
   */
  private parseGermanNumber(value: string | number): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    // Remove dots (thousands separator) and replace comma with dot
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  }
}

// Export singleton instance
export const dailyStatsAggregator = new DailyStatsAggregatorV2();
