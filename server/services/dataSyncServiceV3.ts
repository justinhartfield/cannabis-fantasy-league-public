/**
 * Data Sync Service V3 - Real Metabase Data
 * Replaces mock data with actual sales/order/revenue data from Metabase
 */

import { getDb } from '../db';
import { 
  manufacturers,
  strains,
  pharmacies,
  manufacturerDailyStats,
  strainDailyStats,
  pharmacyDailyStats,
} from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { createSyncJob } from './syncLogger';
import { getMetabaseDailyStatsClient } from '../lib/metabase-daily-stats';
import { isBrandMigrationName } from '../../shared/brandMigration';

export class DataSyncServiceV3 {
  /**
   * Sync daily stats with REAL Metabase data
   */
  async syncDailyStats(targetDate?: string): Promise<void> {
    const logger = await createSyncJob('sync-daily-stats-v3');

    try {
      await logger.updateJobStatus('running');

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const dateInput = targetDate ? new Date(`${targetDate}T00:00:00Z`) : new Date();
      if (Number.isNaN(dateInput.getTime())) {
        throw new Error(`Invalid date provided: ${targetDate}`);
      }
      const statDate = dateInput.toISOString().split('T')[0];

      await logger.info(`Starting REAL daily stats sync for ${statDate}...`);

      const metabaseClient = getMetabaseDailyStatsClient();
      const counts = {
        manufacturers: 0,
        products: 0,
        pharmacies: 0,
      };

      // Sync Manufacturers with REAL data
      await logger.info('Fetching REAL manufacturer stats from Metabase...');
      const manufacturerStats = await metabaseClient.fetchManufacturerDailyStats(statDate);
      await logger.info(`Received ${manufacturerStats.length} manufacturers with data`);

      for (const stats of manufacturerStats) {
        if (isBrandMigrationName(stats.manufacturerName)) {
          await logger.info(`[BrandMigration] Skipping ${stats.manufacturerName} in real manufacturer stats (treated as brand)`);
          continue;
        }
        // Find manufacturer by name
        const mfgRecords = await db.select().from(manufacturers)
          .where(eq(manufacturers.name, stats.manufacturerName))
          .limit(1);

        if (mfgRecords.length === 0) {
          await logger.warn(`Manufacturer not found: ${stats.manufacturerName}`);
          continue;
        }

        const mfg = mfgRecords[0];

        await db.insert(manufacturerDailyStats)
          .values({
            manufacturerId: mfg.id,
            statDate,
            salesVolumeGrams: stats.salesVolumeGrams,
            orderCount: stats.orderCount,
            revenueCents: stats.revenueCents,
            growthRatePercent: 0, // TODO: Calculate based on previous day
            marketShareRank: mfg.currentRank || mfg.id,
            rankChange: 0,
            productCount: mfg.productCount || 0,
            totalPoints: 0,
          })
          .onConflictDoUpdate({
            target: [manufacturerDailyStats.manufacturerId, manufacturerDailyStats.statDate],
            set: {
              salesVolumeGrams: stats.salesVolumeGrams,
              orderCount: stats.orderCount,
              revenueCents: stats.revenueCents,
              updatedAt: new Date().toISOString(),
            },
          });

        counts.manufacturers++;
      }

      // Sync Products with REAL data
      await logger.info('Fetching REAL product stats from Metabase...');
      const productStats = await metabaseClient.fetchProductDailyStats(statDate);
      await logger.info(`Received ${productStats.length} products with data`);

      for (const stats of productStats) {
        // Find product by name
        const productRecords = await db.select().from(strains)
          .where(eq(strains.name, stats.productName))
          .limit(1);

        if (productRecords.length === 0) {
          await logger.warn(`Product not found: ${stats.productName}`);
          continue;
        }

        const product = productRecords[0];

        await db.insert(strainDailyStats)
          .values({
            strainId: product.id,
            statDate,
            salesVolumeGrams: stats.salesVolumeGrams,
            orderCount: stats.orderCount,
            favoriteCount: product.favoriteCount || 0,
            favoriteGrowth: 0,
            pharmacyCount: product.pharmacyCount || 0,
            pharmacyExpansion: 0,
            avgPriceCents: product.avgPriceCents || 0,
            priceStability: 100,
            orderVolumeGrams: stats.salesVolumeGrams,
            totalPoints: 0,
          })
          .onConflictDoUpdate({
            target: [strainDailyStats.strainId, strainDailyStats.statDate],
            set: {
              salesVolumeGrams: stats.salesVolumeGrams,
              orderCount: stats.orderCount,
              orderVolumeGrams: stats.salesVolumeGrams,
              updatedAt: new Date().toISOString(),
            },
          });

        counts.products++;
      }

      // Sync Pharmacies with REAL data
      await logger.info('Fetching REAL pharmacy stats from Metabase...');
      const pharmacyStats = await metabaseClient.fetchPharmacyDailyStats(statDate);
      await logger.info(`Received ${pharmacyStats.length} pharmacies with data`);

      for (const stats of pharmacyStats) {
        // Find pharmacy by name
        const pharmacyRecords = await db.select().from(pharmacies)
          .where(eq(pharmacies.name, stats.pharmacyName))
          .limit(1);

        if (pharmacyRecords.length === 0) {
          await logger.warn(`Pharmacy not found: ${stats.pharmacyName}`);
          continue;
        }

        const pharmacy = pharmacyRecords[0];

        await db.insert(pharmacyDailyStats)
          .values({
            pharmacyId: pharmacy.id,
            statDate,
            revenueCents: stats.revenueCents,
            orderCount: stats.orderCount,
            avgOrderSizeGrams: pharmacy.avgOrderSizeGrams || 0,
            customerRetentionRate: pharmacy.customerRetentionRate || 0,
            productVariety: pharmacy.productCount || 0,
            appUsageRate: pharmacy.appUsageRate || 0,
            growthRatePercent: 0,
            totalPoints: 0,
          })
          .onConflictDoUpdate({
            target: [pharmacyDailyStats.pharmacyId, pharmacyDailyStats.statDate],
            set: {
              revenueCents: stats.revenueCents,
              orderCount: stats.orderCount,
              updatedAt: new Date().toISOString(),
            },
          });

        counts.pharmacies++;
      }

      await logger.info(`Sync complete: ${counts.manufacturers} manufacturers, ${counts.products} products, ${counts.pharmacies} pharmacies`);
      await logger.updateJobStatus('completed', undefined, counts);
      
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logger.error('Daily stats sync failed', { error: errorMessage });
      await logger.updateJobStatus('failed', errorMessage);
      throw error;
    }
  }
}

// Singleton instance
let dataSyncServiceV3Instance: DataSyncServiceV3 | null = null;

export function getDataSyncServiceV3(): DataSyncServiceV3 {
  if (!dataSyncServiceV3Instance) {
    dataSyncServiceV3Instance = new DataSyncServiceV3();
  }
  return dataSyncServiceV3Instance;
}
