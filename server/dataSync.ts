/**
 * Data Synchronization Service
 * 
 * Syncs data from Metabase to local database tables.
 * Handles upserts, error recovery, and maintains data consistency.
 */

import { getDb } from './db';
import { getMetabaseClient } from './metabase';
import { getCannabisStrainStatsCalculator } from './cannabisStrainStatsCalculator';
import { manufacturers, strains, pharmacies, cannabisStrains, brands } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { isBrandMigrationName } from '../shared/brandMigration';

export class DataSyncService {
  /**
   * Sync manufacturers from Metabase to database
   */
  async syncManufacturers(): Promise<void> {
    console.log('[DataSync] Starting manufacturer sync...');
    
    try {
      const metabase = getMetabaseClient();
      const manufacturerData = await metabase.fetchManufacturers();
      const db = await getDb();

      if (!db) {
        throw new Error('Database not available');
      }

      let synced = 0;
      let errors = 0;

      for (const mfg of manufacturerData) {
        try {
          if (isBrandMigrationName(mfg.name)) {
            console.log(`[DataSync] Skipping ${mfg.name} (handled as brand)`);
            continue;
          }
          // Check if manufacturer exists
          const existing = await db
            .select()
            .from(manufacturers)
            .where(eq(manufacturers.name, mfg.name))
            .limit(1);

          if (existing.length > 0) {
            // Update existing manufacturer
            await db
              .update(manufacturers)
              .set({
                currentRank: mfg.rank_1d,
                weeklyRank: mfg.rank_7d,
                monthlyRank: mfg.rank_30d,
                quarterlyRank: mfg.rank_90d,
                productCount: mfg.product_count,
                updatedAt: new Date(),
              })
              .where(eq(manufacturers.id, existing[0].id));
          } else {
            // Insert new manufacturer
            await db.insert(manufacturers).values({
              name: mfg.name,
              currentRank: mfg.rank_1d,
              weeklyRank: mfg.rank_7d,
              monthlyRank: mfg.rank_30d,
              quarterlyRank: mfg.rank_90d,
              productCount: mfg.product_count,
            });
          }

          synced++;
        } catch (error) {
          console.error(`[DataSync] Error syncing manufacturer ${mfg.name}:`, error);
          errors++;
        }
      }

      console.log(`[DataSync] Manufacturer sync complete: ${synced} synced, ${errors} errors`);
    } catch (error) {
      console.error('[DataSync] Manufacturer sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync brands from Metabase to database
   */
  async syncBrands(): Promise<void> {
    console.log('[DataSync] Starting brands sync...');
    
    try {
      const metabase = getMetabaseClient();
      const brandData = await metabase.fetchBrands();
      const db = await getDb();

      if (!db) {
        throw new Error('Database not available');
      }

      let synced = 0;
      let errors = 0;

      for (const brand of brandData) {
        try {
          // Check if brand exists
          const existing = await db
            .select()
            .from(brands)
            .where(eq(brands.name, brand.name))
            .limit(1);

          if (existing.length > 0) {
            // Update existing brand
            await db
              .update(brands)
              .set({
                slug: brand.slug,
                description: brand.description,
                logoUrl: brand.logoUrl,
                websiteUrl: brand.websiteUrl,
                totalFavorites: brand.totalFavorites,
                totalViews: brand.totalViews,
                totalComments: brand.totalComments,
                affiliateClicks: brand.affiliateClicks,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(brands.id, existing[0].id));
          } else {
            // Insert new brand
            await db.insert(brands).values({
              name: brand.name,
              slug: brand.slug,
              description: brand.description,
              logoUrl: brand.logoUrl,
              websiteUrl: brand.websiteUrl,
              totalFavorites: brand.totalFavorites,
              totalViews: brand.totalViews,
              totalComments: brand.totalComments,
              affiliateClicks: brand.affiliateClicks,
            });
          }

          synced++;
        } catch (error) {
          console.error(`[DataSync] Error syncing brand ${brand.name}:`, error);
          errors++;
        }
      }

      console.log(`[DataSync] Brands sync complete: ${synced} synced, ${errors} errors`);
    } catch (error) {
      console.error('[DataSync] Brands sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync cannabis strains (genetics/cultivars) from Metabase to database
   */
  async syncCannabisStrains(): Promise<void> {
    console.log('[DataSync] Starting cannabis strain sync...');
    
    try {
      const metabase = getMetabaseClient();
      const strainData = await metabase.fetchCannabisStrains();
      const db = await getDb();

      if (!db) {
        throw new Error('Database not available');
      }

      let synced = 0;
      let errors = 0;

      for (const strain of strainData) {
        try {
          // Check if strain exists by metabaseId
          const existing = await db
            .select()
            .from(cannabisStrains)
            .where(eq(cannabisStrains.metabaseId, strain.metabaseId))
            .limit(1);

          if (existing.length > 0) {
            // Update existing strain
            await db
              .update(cannabisStrains)
              .set({
                name: strain.name,
                slug: strain.slug,
                type: strain.type as any,
                description: strain.description,
                effects: strain.effects,
                flavors: strain.flavors,
                terpenes: strain.terpenes,
                thcMin: strain.thcMin,
                thcMax: strain.thcMax,
                cbdMin: strain.cbdMin,
                cbdMax: strain.cbdMax,
                pharmaceuticalProductCount: strain.pharmaceuticalProductCount,
                updatedAt: new Date(),
              })
              .where(eq(cannabisStrains.id, existing[0].id));
          } else {
            // Insert new strain
            await db.insert(cannabisStrains).values({
              metabaseId: strain.metabaseId,
              name: strain.name,
              slug: strain.slug,
              type: strain.type as any,
              description: strain.description,
              effects: strain.effects,
              flavors: strain.flavors,
              terpenes: strain.terpenes,
              thcMin: strain.thcMin,
              thcMax: strain.thcMax,
              cbdMin: strain.cbdMin,
              cbdMax: strain.cbdMax,
              pharmaceuticalProductCount: strain.pharmaceuticalProductCount,
            });
          }

          synced++;
        } catch (error) {
          console.error(`[DataSync] Error syncing cannabis strain ${strain.name}:`, error);
          errors++;
        }
      }

      console.log(`[DataSync] Cannabis strain sync complete: ${synced} synced, ${errors} errors`);
    } catch (error) {
      console.error('[DataSync] Cannabis strain sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync products (strains) from Metabase to database
   */
  async syncStrains(): Promise<void> {
    console.log('[DataSync] Starting strain sync...');
    
    try {
      const metabase = getMetabaseClient();
      const strainData = await metabase.fetchStrains();
      const db = await getDb();

      if (!db) {
        throw new Error('Database not available');
      }

      let synced = 0;
      let errors = 0;

      for (const strain of strainData) {
        try {
          // Get manufacturer ID
          const mfgResult = await db
            .select()
            .from(manufacturers)
            .where(eq(manufacturers.name, strain.manufacturer))
            .limit(1);

          const manufacturerId = mfgResult.length > 0 ? mfgResult[0].id : null;

          // Convert prices to cents
          const avgPriceCents = Math.round(strain.avg_price * 100);
          const minPriceCents = Math.round(strain.min_price * 100);
          const maxPriceCents = Math.round(strain.max_price * 100);

          // Determine price category
          let priceCategory: 'excellent' | 'below_average' | 'average' | 'above_average' | 'expensive' = 'average';
          if (strain.price_category) {
            priceCategory = strain.price_category as any;
          }

          // Determine genetics
          let genetics: 'sativa' | 'indica' | 'hybrid' | null = null;
          // This would be determined from product name or additional data
          // For now, default to hybrid
          genetics = 'hybrid';

          // Check if strain exists
          const existing = await db
            .select()
            .from(strains)
            .where(eq(strains.name, strain.name))
            .limit(1);

          if (existing.length > 0) {
            // Update existing strain
            await db
              .update(strains)
              .set({
                manufacturerId,
                manufacturerName: strain.manufacturer,
                favoriteCount: strain.favorite_count,
                pharmacyCount: strain.pharmacy_count,
                avgPriceCents,
                minPriceCents,
                maxPriceCents,
                priceCategory,
                thcContent: strain.thc_content,
                cbdContent: strain.cbd_content,
                genetics,
                updatedAt: new Date(),
              })
              .where(eq(strains.id, existing[0].id));
          } else {
            // Insert new strain
            await db.insert(strains).values({
              name: strain.name,
              manufacturerId,
              manufacturerName: strain.manufacturer,
              favoriteCount: strain.favorite_count,
              pharmacyCount: strain.pharmacy_count,
              avgPriceCents,
              minPriceCents,
              maxPriceCents,
              priceCategory,
              thcContent: strain.thc_content,
              cbdContent: strain.cbd_content,
              genetics,
            });
          }

          synced++;
        } catch (error) {
          console.error(`[DataSync] Error syncing strain ${strain.name}:`, error);
          errors++;
        }
      }

      console.log(`[DataSync] Strain sync complete: ${synced} synced, ${errors} errors`);
    } catch (error) {
      console.error('[DataSync] Strain sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync pharmacies from Metabase to database
   */
  async syncPharmacies(): Promise<void> {
    console.log('[DataSync] Starting pharmacy sync...');
    
    try {
      const metabase = getMetabaseClient();
      const pharmacyData = await metabase.fetchPharmacies();
      const db = await getDb();

      if (!db) {
        throw new Error('Database not available');
      }

      let synced = 0;
      let errors = 0;

      for (const pharmacy of pharmacyData) {
        try {
          // Convert revenue to cents
          const weeklyRevenueCents = Math.round(pharmacy.weekly_revenue * 100);

          // Check if pharmacy exists
          const existing = await db
            .select()
            .from(pharmacies)
            .where(eq(pharmacies.name, pharmacy.name))
            .limit(1);

          if (existing.length > 0) {
            // Update existing pharmacy
            await db
              .update(pharmacies)
              .set({
                city: pharmacy.city,
                state: pharmacy.state,
                productCount: pharmacy.product_count,
                weeklyRevenueCents,
                weeklyOrderCount: pharmacy.weekly_orders,
                avgOrderSizeGrams: pharmacy.avg_order_size,
                customerRetentionRate: pharmacy.retention_rate,
                appUsageRate: pharmacy.app_usage_rate,
                updatedAt: new Date(),
              })
              .where(eq(pharmacies.id, existing[0].id));
          } else {
            // Insert new pharmacy
            await db.insert(pharmacies).values({
              name: pharmacy.name,
              city: pharmacy.city,
              state: pharmacy.state,
              productCount: pharmacy.product_count,
              weeklyRevenueCents,
              weeklyOrderCount: pharmacy.weekly_orders,
              avgOrderSizeGrams: pharmacy.avg_order_size,
              customerRetentionRate: pharmacy.retention_rate,
              appUsageRate: pharmacy.app_usage_rate,
            });
          }

          synced++;
        } catch (error) {
          console.error(`[DataSync] Error syncing pharmacy ${pharmacy.name}:`, error);
          errors++;
        }
      }

      console.log(`[DataSync] Pharmacy sync complete: ${synced} synced, ${errors} errors`);
    } catch (error) {
      console.error('[DataSync] Pharmacy sync failed:', error);
      throw error;
    }
  }

  /**
   * Sync all data (manufacturers, cannabis strains, products, pharmacies)
   */
  async syncAll(): Promise<void> {
    console.log('[DataSync] Starting full data sync...');
    
    const startTime = Date.now();

    try {
      // Sync in order: manufacturers, brands, and cannabis strains first (products depend on them)
      await this.syncManufacturers();
      await this.syncBrands();
      await this.syncCannabisStrains();
      await this.syncStrains(); // Products
      await this.syncPharmacies();

      const duration = Date.now() - startTime;
      console.log(`[DataSync] Full sync complete in ${duration}ms`);
    } catch (error) {
      console.error('[DataSync] Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Create weekly snapshots for scoring
   * Called at the end of each week (Monday 00:00 CET)
   */
  async createWeeklySnapshots(year: number, week: number): Promise<void> {
    console.log(`[DataSync] Creating weekly snapshots for ${year}-W${week}...`);
    
    try {
      const db = await getDb();

      if (!db) {
        throw new Error('Database not available');
      }

      // Calculate cannabis strain weekly stats
      const cannabisStrainStatsCalc = getCannabisStrainStatsCalculator();
      await cannabisStrainStatsCalc.calculateWeeklyStats(year, week);
      
      console.log(`[DataSync] Weekly snapshot creation for ${year}-W${week} complete`);
      
      // TODO: Also copy current state from manufacturers/strains/pharmacies
      // to manufacturerWeeklyStats/strainWeeklyStats/pharmacyWeeklyStats
    } catch (error) {
      console.error('[DataSync] Weekly snapshot creation failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let dataSyncService: DataSyncService | null = null;

export function getDataSyncService(): DataSyncService {
  if (!dataSyncService) {
    dataSyncService = new DataSyncService();
  }
  return dataSyncService;
}

/**
 * Schedule hourly data sync
 */
export function scheduleHourlySync(): void {
  const syncService = getDataSyncService();

  // Run initial sync immediately
  console.log('[DataSync] Running initial sync...');
  syncService.syncAll().catch(error => {
    console.error('[DataSync] Initial sync failed:', error);
  });

  // Schedule hourly sync
  const HOUR_MS = 60 * 60 * 1000;
  setInterval(() => {
    console.log('[DataSync] Running scheduled hourly sync...');
    syncService.syncAll().catch(error => {
      console.error('[DataSync] Scheduled sync failed:', error);
    });
  }, HOUR_MS);

  console.log('[DataSync] Hourly sync scheduler started');
}

/**
 * Schedule weekly snapshot creation
 * Runs every Monday at 00:00 CET
 */
export function scheduleWeeklySnapshot(): void {
  const syncService = getDataSyncService();

  // Calculate time until next Monday 00:00 CET
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
  nextMonday.setHours(0, 0, 0, 0);

  const msUntilNextMonday = nextMonday.getTime() - now.getTime();

  console.log(`[DataSync] Next weekly snapshot scheduled for ${nextMonday.toISOString()}`);

  // Schedule first snapshot
  setTimeout(() => {
    const year = nextMonday.getFullYear();
    const week = getWeekNumber(nextMonday);
    
    console.log(`[DataSync] Running weekly snapshot for ${year}-W${week}...`);
    syncService.createWeeklySnapshots(year, week).catch(error => {
      console.error('[DataSync] Weekly snapshot failed:', error);
    });

    // Schedule recurring weekly snapshots
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    setInterval(() => {
      const now = new Date();
      const year = now.getFullYear();
      const week = getWeekNumber(now);
      
      console.log(`[DataSync] Running weekly snapshot for ${year}-W${week}...`);
      syncService.createWeeklySnapshots(year, week).catch(error => {
        console.error('[DataSync] Weekly snapshot failed:', error);
      });
    }, WEEK_MS);
  }, msUntilNextMonday);

  console.log('[DataSync] Weekly snapshot scheduler started');
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
