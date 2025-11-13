/**
 * Refactored Data Synchronization Service
 * Uses Drizzle ORM properly with no raw SQL
 * Includes comprehensive logging and error handling
 */

import { getDb } from '../db';
import { getMetabaseClient } from '../metabase';
import { cannabisStrains, brands, manufacturers, pharmacies, strains } from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { createSyncJob, SyncLogger } from './syncLogger';

export class DataSyncServiceV2 {
  /**
   * Sync cannabis strains from Metabase
   */
  async syncStrains(): Promise<void> {
    const logger = await createSyncJob('sync-strains');
    
    try {
      await logger.updateJobStatus('running');
      await logger.info('Starting cannabis strains sync...');
      
      const metabase = getMetabaseClient();
      const strainsData = await metabase.fetchCannabisStrains();
      
      await logger.info(`Fetched ${strainsData.length} strains from Metabase`);
      await logger.updateJobStatus('running', undefined, { total: strainsData.length });
      
      let synced = 0;
      let errors = 0;

      for (const strain of strainsData) {
        try {
          // Use Drizzle's insert with onConflictDoUpdate
          const db = await getDb();
          if (!db) throw new Error('Database not available');
          await db.insert(cannabisStrains)
            .values({
              metabaseId: strain.metabaseId,
              name: strain.name,
              slug: strain.slug,
              type: strain.type,
              description: strain.description,
              effects: strain.effects || null,
              flavors: strain.flavors || null,
              terpenes: strain.terpenes || null,
              thcMin: strain.thcMin,
              thcMax: strain.thcMax,
              cbdMin: strain.cbdMin,
              cbdMax: strain.cbdMax,
              pharmaceuticalProductCount: strain.pharmaceuticalProductCount || 0,
            })
            .onConflictDoUpdate({
              target: cannabisStrains.metabaseId,
              set: {
                name: strain.name,
                slug: strain.slug,
                type: strain.type,
                description: strain.description,
                effects: strain.effects || null,
                flavors: strain.flavors || null,
                terpenes: strain.terpenes || null,
                thcMin: strain.thcMin,
                thcMax: strain.thcMax,
                cbdMin: strain.cbdMin,
                cbdMax: strain.cbdMax,
                pharmaceuticalProductCount: strain.pharmaceuticalProductCount || 0,
                updatedAt: new Date().toISOString(),
              },
            });

          synced++;
          
          if (synced % 50 === 0) {
            await logger.info(`Progress: ${synced}/${strainsData.length} strains synced`);
            await logger.updateJobStatus('running', undefined, { processed: synced });
          }
        } catch (error) {
          errors++;
          await logger.error(`Failed to sync strain: ${strain.name}`, {
            error: error instanceof Error ? error.message : String(error),
            strain: strain.name,
          });
        }
      }

      await logger.updateJobStatus('running', undefined, { processed: synced });
      await logger.info(`Sync complete: ${synced} synced, ${errors} errors`);
      await logger.updateJobStatus('completed', `Successfully synced ${synced} strains with ${errors} errors`);
      
    } catch (error) {
      await logger.error('Strains sync failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      await logger.updateJobStatus('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Sync brands from Metabase
   */
  async syncBrands(): Promise<void> {
    const logger = await createSyncJob('sync-brands');
    
    try {
      await logger.updateJobStatus('running');
      await logger.info('Starting brands sync...');
      
      const metabase = getMetabaseClient();
      const brandsData = await metabase.fetchBrands();
      
      await logger.info(`Fetched ${brandsData.length} brands from Metabase`);
      await logger.updateJobStatus('running', undefined, { total: brandsData.length });
      
      let synced = 0;
      let errors = 0;

      for (const brand of brandsData) {
        try {
          // Use Drizzle's insert with onConflictDoUpdate
          const db = await getDb();
          if (!db) throw new Error('Database not available');
          await db.insert(brands)
            .values({
              name: brand.name,
              slug: brand.slug,
              description: brand.description,
              logoUrl: brand.logoUrl,
              websiteUrl: brand.websiteUrl,
              totalFavorites: brand.totalFavorites || 0,
              totalViews: brand.totalViews || 0,
              totalComments: brand.totalComments || 0,
              affiliateClicks: brand.affiliateClicks || 0,
            })
            .onConflictDoUpdate({
              target: brands.name,
              set: {
                slug: brand.slug,
                description: brand.description,
                logoUrl: brand.logoUrl,
                websiteUrl: brand.websiteUrl,
                totalFavorites: brand.totalFavorites || 0,
                totalViews: brand.totalViews || 0,
                totalComments: brand.totalComments || 0,
                affiliateClicks: brand.affiliateClicks || 0,
                updatedAt: new Date().toISOString(),
              },
            });

          synced++;
          
          if (synced % 20 === 0) {
            await logger.info(`Progress: ${synced}/${brandsData.length} brands synced`);
            await logger.updateJobStatus('running', undefined, { processed: synced });
          }
        } catch (error) {
          errors++;
          await logger.error(`Failed to sync brand: ${brand.name}`, {
            error: error instanceof Error ? error.message : String(error),
            brand: brand.name,
          });
        }
      }

      await logger.updateJobStatus('running', undefined, { processed: synced });
      await logger.info(`Sync complete: ${synced} synced, ${errors} errors`);
      await logger.updateJobStatus('completed', `Successfully synced ${synced} brands with ${errors} errors`);
      
    } catch (error) {
      await logger.error('Brands sync failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      await logger.updateJobStatus('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Sync manufacturers from Metabase
   */
  async syncManufacturers(): Promise<void> {
    const logger = await createSyncJob('sync-manufacturers');
    
    try {
      await logger.updateJobStatus('running');
      await logger.info('Starting manufacturers sync...');
      
      const metabase = getMetabaseClient();
      const mfgData = await metabase.fetchManufacturers();
      
      await logger.info(`Fetched ${mfgData.length} manufacturers from Metabase`);
      await logger.updateJobStatus('running', undefined, { total: mfgData.length });
      
      let synced = 0;
      let errors = 0;

      for (const mfg of mfgData) {
        try {
          // Check if exists
          const db = await getDb();
          if (!db) throw new Error('Database not available');
          const existing = await db
            .select()
            .from(manufacturers)
            .where(eq(manufacturers.name, mfg.name))
            .limit(1);

          if (existing.length > 0) {
            // Update
            await db
              .update(manufacturers)
              .set({
                currentRank: mfg.rank_1d,
                weeklyRank: mfg.rank_7d,
                monthlyRank: mfg.rank_30d,
                quarterlyRank: mfg.rank_90d,
                productCount: mfg.product_count,
                updatedAt: new Date().toISOString(),
              })
              .where(eq(manufacturers.id, existing[0].id));
          } else {
            // Insert
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
          
          if (synced % 10 === 0) {
            await logger.info(`Progress: ${synced}/${mfgData.length} manufacturers synced`);
            await logger.updateJobStatus('running', undefined, { processed: synced });
          }
        } catch (error) {
          errors++;
          await logger.error(`Failed to sync manufacturer: ${mfg.name}`, {
            error: error instanceof Error ? error.message : String(error),
            manufacturer: mfg.name,
          });
        }
      }

      await logger.updateJobStatus('running', undefined, { processed: synced });
      await logger.info(`Sync complete: ${synced} synced, ${errors} errors`);
      await logger.updateJobStatus('completed', `Successfully synced ${synced} manufacturers with ${errors} errors`);
      
    } catch (error) {
      await logger.error('Manufacturers sync failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      await logger.updateJobStatus('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Sync pharmaceutical products (strains table)
   */
  async syncProducts(): Promise<void> {
    const logger = await createSyncJob('sync-products');
    
    try {
      await logger.updateJobStatus('running');
      await logger.info('Starting products sync...');
      
      const metabase = getMetabaseClient();
      const productsData = await metabase.fetchStrains();
      await logger.info(`Fetched ${productsData.length} products from Metabase`);
      await logger.updateJobStatus('running', undefined, { total: productsData.length });
      
      let synced = 0;
      let errors = 0;

      for (const product of productsData) {
        try {
          const db = await getDb();
          if (!db) throw new Error('Database not available');
          
          // Convert price from euros to cents
          const avgPriceCents = Math.round(product.avg_price * 100);
          const minPriceCents = Math.round(product.min_price * 100);
          const maxPriceCents = Math.round(product.max_price * 100);
          
          await db.insert(strains)
            .values({
              metabaseId: product.metabaseId,
              name: product.name,
              manufacturerName: product.manufacturer,
              favoriteCount: product.favorite_count,
              pharmacyCount: product.pharmacy_count,
              avgPriceCents,
              minPriceCents,
              maxPriceCents,
              priceCategory: product.price_category,
              thcContent: product.thc_content,
              cbdContent: product.cbd_content,
            })
            .onConflictDoUpdate({
              target: strains.metabaseId,
              set: {
                manufacturerName: product.manufacturer,
                favoriteCount: product.favorite_count,
                pharmacyCount: product.pharmacy_count,
                avgPriceCents,
                minPriceCents,
                maxPriceCents,
                priceCategory: product.price_category,
                thcContent: product.thc_content,
                cbdContent: product.cbd_content,
                updatedAt: new Date().toISOString(),
              },
            });

          synced++;
          
          if (synced % 100 === 0) {
            await logger.info(`Progress: ${synced}/${productsData.length} products synced`);
            await logger.updateJobStatus('running', undefined, { processed: synced });
          }
        } catch (error) {
          errors++;
          await logger.error(`Failed to sync product: ${product.name}`, {
            error: error instanceof Error ? error.message : String(error),
            product: product.name,
          });
        }
      }

      await logger.updateJobStatus('running', undefined, { processed: synced });
      await logger.info(`Sync complete: ${synced} synced, ${errors} errors`);
      await logger.updateJobStatus('completed', `Successfully synced ${synced} products with ${errors} errors`);
      
    } catch (error) {
      await logger.error('Products sync failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      await logger.updateJobStatus('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Sync all data sources
   */
  async syncAll(): Promise<void> {
    const logger = await createSyncJob('sync-all');
    
    try {
      await logger.updateJobStatus('running');
      await logger.info('Starting full data sync...');
      
      await this.syncManufacturers();
      await this.syncBrands();
      await this.syncStrains();
      await this.syncProducts();
      
      await logger.info('Full data sync completed successfully');
      await logger.updateJobStatus('completed', 'All data sources synced successfully');
      
    } catch (error) {
      await logger.error('Full sync failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      await logger.updateJobStatus('failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}

// Singleton instance
let dataSyncServiceInstance: DataSyncServiceV2 | null = null;

export function getDataSyncServiceV2(): DataSyncServiceV2 {
  if (!dataSyncServiceInstance) {
    dataSyncServiceInstance = new DataSyncServiceV2();
  }
  return dataSyncServiceInstance;
}
