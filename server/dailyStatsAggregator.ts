/**
 * Daily Stats Aggregator
 * 
 * Aggregates raw prescription/order data from Metabase into daily stats
 * for manufacturers, strains, products, and pharmacies.
 * Runs daily to populate *DailyStats tables for challenge scoring.
 */

import { getDb } from './db';
import {
  manufacturerDailyStats,
  strainDailyStats,
  cannabisStrainDailyStats,
  pharmacyDailyStats,
  brandDailyStats,
} from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { execSync } from 'child_process';
import * as fs from 'fs';

// MCP CLI wrapper for Metabase queries
async function executeMetabaseQuery(query: string, database_id: number = 2): Promise<any> {
  // Create input JSON
  const input = JSON.stringify({
    database_id,
    query,
    row_limit: 2000,
  });

  // Execute MCP CLI command
  const result = execSync(
    `manus-mcp-cli tool call execute --server=metabase --input '${input}'`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  );

  // Parse the JSON result
  const lines = result.split('\n');
  const jsonLine = lines.find((line: string) => line.trim().startsWith('{'));
  if (!jsonLine) {
    throw new Error('No JSON response from Metabase');
  }

  const response = JSON.parse(jsonLine);
  return response.data?.rows || [];
}

export class DailyStatsAggregator {
  /**
   * Aggregate manufacturer daily stats from prescriptions
   */
  async aggregateManufacturerStats(statDate: string): Promise<void> {
    console.log(`[DailyStats] Aggregating manufacturer stats for ${statDate}...`);

    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Query prescriptions for the specific date
      // Join Product -> Manufacturer to get manufacturer data
      const query = `
        SELECT 
          p.manufacturer AS manufacturer_name,
          SUM(pr.quantity) AS sales_volume_grams,
          COUNT(DISTINCT pr._id) AS prescription_count,
          COUNT(DISTINCT p._id) AS product_count
        FROM Prescription pr
        JOIN Product p ON pr.product = p._id
        WHERE DATE(pr.createdAt) = '${statDate}'
        GROUP BY p.manufacturer
      `;

      const rows = await executeMetabaseQuery(query);

      console.log(`[DailyStats] Found ${rows.length} manufacturers with activity on ${statDate}`);

      for (const row of rows) {
        const manufacturerName = row[0];
        const salesVolume = row[1] || 0;
        const prescriptionCount = row[2] || 0;
        const productCount = row[3] || 0;

        // Find manufacturer ID from our database
        const mfgResult = await db.query.manufacturers.findFirst({
          where: (manufacturers, { eq }) => eq(manufacturers.name, manufacturerName),
        });

        if (!mfgResult) {
          console.log(`[DailyStats] Manufacturer not found: ${manufacturerName}`);
          continue;
        }

        // Check if stats already exist for this date
        const existing = await db
          .select()
          .from(manufacturerDailyStats)
          .where(
            and(
              eq(manufacturerDailyStats.manufacturerId, mfgResult.id),
              eq(manufacturerDailyStats.statDate, statDate)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing stats
          await db
            .update(manufacturerDailyStats)
            .set({
              salesVolumeGrams: salesVolume,
              prescriptionCount,
              productCount,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(manufacturerDailyStats.id, existing[0].id));
        } else {
          // Insert new stats
          await db.insert(manufacturerDailyStats).values({
            manufacturerId: mfgResult.id,
            statDate,
            salesVolumeGrams: salesVolume,
            growthRatePercent: 0, // Calculate from previous day if needed
            marketShareRank: 0, // Calculate after all manufacturers are aggregated
            rankChange: 0,
            prescriptionCount,
            productCount,
          });
        }
      }

      console.log(`[DailyStats] Manufacturer stats aggregation complete for ${statDate}`);
    } catch (error) {
      console.error(`[DailyStats] Error aggregating manufacturer stats:`, error);
      throw error;
    }
  }

  /**
   * Aggregate cannabis strain daily stats from favorites and prescriptions
   */
  async aggregateCannabisStrainStats(statDate: string): Promise<void> {
    console.log(`[DailyStats] Aggregating cannabis strain stats for ${statDate}...`);

    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Query strain favorites and prescription counts for the date
      const query = `
        SELECT 
          s.name AS strain_name,
          COUNT(DISTINCT f._id) AS favorite_count,
          COUNT(DISTINCT ph._id) AS pharmacy_count,
          COUNT(DISTINCT p._id) AS product_count,
          AVG(p.price) AS avg_price
        FROM Strain s
        LEFT JOIN Favorite f ON f.strain = s._id AND DATE(f.createdAt) <= '${statDate}'
        LEFT JOIN Product p ON p.strain = s._id
        LEFT JOIN Pharmacy ph ON p.pharmacy = ph._id
        GROUP BY s.name
      `;

      const rows = await executeMetabaseQuery(query);

      console.log(`[DailyStats] Found ${rows.length} cannabis strains with activity on ${statDate}`);

      for (const row of rows) {
        const strainName = row[0];
        const favoriteCount = row[1] || 0;
        const pharmacyCount = row[2] || 0;
        const productCount = row[3] || 0;
        const avgPrice = row[4] || 0;

        // Find cannabis strain ID from our database
        const strainResult = await db.query.cannabisStrains.findFirst({
          where: (cannabisStrains, { eq }) => eq(cannabisStrains.name, strainName),
        });

        if (!strainResult) {
          console.log(`[DailyStats] Cannabis strain not found: ${strainName}`);
          continue;
        }

        // Check if stats already exist for this date
        const existing = await db
          .select()
          .from(cannabisStrainDailyStats)
          .where(
            and(
              eq(cannabisStrainDailyStats.strainId, strainResult.id),
              eq(cannabisStrainDailyStats.statDate, statDate)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing stats
          await db
            .update(cannabisStrainDailyStats)
            .set({
              favoriteCount,
              pharmacyCount,
              productCount,
              avgPrice,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(cannabisStrainDailyStats.id, existing[0].id));
        } else {
          // Insert new stats
          await db.insert(cannabisStrainDailyStats).values({
            strainId: strainResult.id,
            statDate,
            favoriteCount,
            pharmacyCount,
            productCount,
            avgPrice,
            minPrice: avgPrice, // Simplified for now
            maxPrice: avgPrice,
            priceChangePercent: 0,
          });
        }
      }

      console.log(`[DailyStats] Cannabis strain stats aggregation complete for ${statDate}`);
    } catch (error) {
      console.error(`[DailyStats] Error aggregating cannabis strain stats:`, error);
      throw error;
    }
  }

  /**
   * Aggregate pharmacy daily stats from orders
   */
  async aggregatePharmacyStats(statDate: string): Promise<void> {
    console.log(`[DailyStats] Aggregating pharmacy stats for ${statDate}...`);

    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Query pharmacy orders for the specific date
      const query = `
        SELECT 
          ph.name AS pharmacy_name,
          SUM(pr.paidAmount) AS revenue,
          COUNT(DISTINCT pr._id) AS order_count,
          COUNT(DISTINCT pr.user) AS unique_customers,
          COUNT(DISTINCT pr.product) AS product_variety
        FROM Prescription pr
        JOIN Product p ON pr.product = p._id
        JOIN Pharmacy ph ON p.pharmacy = ph._id
        WHERE DATE(pr.createdAt) = '${statDate}'
        GROUP BY ph.name
      `;

      const rows = await executeMetabaseQuery(query);

      console.log(`[DailyStats] Found ${rows.length} pharmacies with activity on ${statDate}`);

      for (const row of rows) {
        const pharmacyName = row[0];
        const revenue = row[1] || 0;
        const orderCount = row[2] || 0;
        const uniqueCustomers = row[3] || 0;
        const productVariety = row[4] || 0;

        // Find pharmacy ID from our database
        const pharmacyResult = await db.query.pharmacies.findFirst({
          where: (pharmacies, { eq }) => eq(pharmacies.name, pharmacyName),
        });

        if (!pharmacyResult) {
          console.log(`[DailyStats] Pharmacy not found: ${pharmacyName}`);
          continue;
        }

        // Check if stats already exist for this date
        const existing = await db
          .select()
          .from(pharmacyDailyStats)
          .where(
            and(
              eq(pharmacyDailyStats.pharmacyId, pharmacyResult.id),
              eq(pharmacyDailyStats.statDate, statDate)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing stats
          await db
            .update(pharmacyDailyStats)
            .set({
              revenue,
              orderCount,
              uniqueCustomers,
              productVariety,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(pharmacyDailyStats.id, existing[0].id));
        } else {
          // Insert new stats
          await db.insert(pharmacyDailyStats).values({
            pharmacyId: pharmacyResult.id,
            statDate,
            revenue,
            orderCount,
            customerRetentionRate: 0, // Calculate from historical data if needed
            productVariety,
            appUsageRate: 0, // Would need app usage data
          });
        }
      }

      console.log(`[DailyStats] Pharmacy stats aggregation complete for ${statDate}`);
    } catch (error) {
      console.error(`[DailyStats] Error aggregating pharmacy stats:`, error);
      throw error;
    }
  }

  /**
   * Aggregate product (strain) daily stats
   */
  async aggregateProductStats(statDate: string): Promise<void> {
    console.log(`[DailyStats] Aggregating product stats for ${statDate}...`);

    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Query product prescriptions for the specific date
      const query = `
        SELECT 
          p._id AS product_id,
          p.name AS product_name,
          COUNT(DISTINCT f._id) AS favorite_count,
          COUNT(DISTINCT pr._id) AS prescription_count,
          SUM(pr.quantity) AS order_volume_grams,
          AVG(pr.unitPrice) AS avg_price
        FROM Product p
        LEFT JOIN Favorite f ON f.product = p._id AND DATE(f.createdAt) <= '${statDate}'
        LEFT JOIN Prescription pr ON pr.product = p._id AND DATE(pr.createdAt) = '${statDate}'
        GROUP BY p._id, p.name
        HAVING prescription_count > 0 OR favorite_count > 0
      `;

      const rows = await executeMetabaseQuery(query);

      console.log(`[DailyStats] Found ${rows.length} products with activity on ${statDate}`);

      for (const row of rows) {
        const productMetabaseId = row[0];
        const productName = row[1];
        const favoriteCount = row[2] || 0;
        const prescriptionCount = row[3] || 0;
        const orderVolume = row[4] || 0;
        const avgPrice = row[5] || 0;

        // Find product ID from our database by metabaseId
        const productResult = await db.query.strains.findFirst({
          where: (strains, { eq }) => eq(strains.metabaseId, productMetabaseId),
        });

        if (!productResult) {
          console.log(`[DailyStats] Product not found: ${productName}`);
          continue;
        }

        // Check if stats already exist for this date
        const existing = await db
          .select()
          .from(strainDailyStats)
          .where(
            and(
              eq(strainDailyStats.strainId, productResult.id),
              eq(strainDailyStats.statDate, statDate)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          // Update existing stats
          await db
            .update(strainDailyStats)
            .set({
              favoriteCount,
              favoriteGrowth: 0, // Calculate from previous day
              pharmacyCount: 0, // Would need pharmacy expansion data
              orderVolumeGrams: orderVolume,
              avgPrice,
              priceStabilityPercent: 0,
              updatedAt: new Date().toISOString(),
            })
            .where(eq(strainDailyStats.id, existing[0].id));
        } else {
          // Insert new stats
          await db.insert(strainDailyStats).values({
            strainId: productResult.id,
            statDate,
            favoriteCount,
            favoriteGrowth: 0,
            pharmacyCount: 0,
            orderVolumeGrams: orderVolume,
            avgPrice,
            priceStabilityPercent: 100, // Assume stable on first day
          });
        }
      }

      console.log(`[DailyStats] Product stats aggregation complete for ${statDate}`);
    } catch (error) {
      console.error(`[DailyStats] Error aggregating product stats:`, error);
      throw error;
    }
  }

  /**
   * Aggregate all daily stats for a specific date
   */
  async aggregateAllStats(statDate: string): Promise<void> {
    console.log(`[DailyStats] Starting full aggregation for ${statDate}...`);

    try {
      await this.aggregateManufacturerStats(statDate);
      await this.aggregateCannabisStrainStats(statDate);
      await this.aggregateProductStats(statDate);
      await this.aggregatePharmacyStats(statDate);

      console.log(`[DailyStats] ✅ Full aggregation complete for ${statDate}`);
    } catch (error) {
      console.error(`[DailyStats] ❌ Aggregation failed for ${statDate}:`, error);
      throw error;
    }
  }
}

// Singleton instance
let aggregatorInstance: DailyStatsAggregator | null = null;

export function getDailyStatsAggregator(): DailyStatsAggregator {
  if (!aggregatorInstance) {
    aggregatorInstance = new DailyStatsAggregator();
  }
  return aggregatorInstance;
}
