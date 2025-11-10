/**
 * Cannabis Strain Stats Calculator
 * 
 * Calculates aggregate statistics for cannabis strains across all products using that strain.
 * This data is used for fantasy scoring.
 */

import { getDb } from './db';
import { 
  cannabisStrains, 
  cannabisStrainWeeklyStats,
  strains as products,
} from '../drizzle/schema';
import { eq, sql } from 'drizzle-orm';

export class CannabisStrainStatsCalculator {
  /**
   * Calculate and store weekly stats for all cannabis strains
   * This aggregates data from all products using each strain
   */
  async calculateWeeklyStats(year: number, week: number): Promise<void> {
    console.log(`[CannabisStrainStats] Calculating weekly stats for ${year}-W${week}...`);
    
    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get all cannabis strains
      const allStrains = await db.select().from(cannabisStrains);
      
      let calculated = 0;
      let errors = 0;

      for (const strain of allStrains) {
        try {
          // Get all products that use this cannabis strain
          const productsUsingStrain = await db
            .select()
            .from(products)
            .where(eq(products.strainId, strain.id));

          if (productsUsingStrain.length === 0) {
            console.log(`[CannabisStrainStats] No products found for strain ${strain.name}, skipping`);
            continue;
          }

          // Calculate aggregate statistics
          const totalFavorites = productsUsingStrain.reduce((sum, p) => sum + p.favoriteCount, 0);
          
          // Get unique pharmacy count across all products
          const pharmacyCount = Math.max(...productsUsingStrain.map(p => p.pharmacyCount));
          
          // Product count is just the number of products using this strain
          const productCount = productsUsingStrain.length;
          
          // Calculate average price across all products
          const avgPriceCents = Math.floor(
            productsUsingStrain.reduce((sum, p) => sum + p.avgPriceCents, 0) / productCount
          );

          // For now, set price change to 0 (we'll need historical data to calculate this)
          const priceChange = 0;

          // Calculate market penetration (simplified: % of total products)
          // TODO: Make this more sophisticated with actual market data
          const totalProducts = await db.select({ count: sql<number>`count(*)` }).from(products);
          const marketPenetration = Math.floor((productCount / Number(totalProducts[0].count)) * 100);

          // Check if stats already exist for this week
          const existingStats = await db
            .select()
            .from(cannabisStrainWeeklyStats)
            .where(
              sql`${cannabisStrainWeeklyStats.cannabisStrainId} = ${strain.id} 
                  AND ${cannabisStrainWeeklyStats.year} = ${year} 
                  AND ${cannabisStrainWeeklyStats.week} = ${week}`
            )
            .limit(1);

          if (existingStats.length > 0) {
            // Update existing stats
            await db
              .update(cannabisStrainWeeklyStats)
              .set({
                totalFavorites,
                pharmacyCount,
                productCount,
                avgPriceCents,
                priceChange,
                marketPenetration,
              })
              .where(eq(cannabisStrainWeeklyStats.id, existingStats[0].id));
          } else {
            // Insert new stats
            await db.insert(cannabisStrainWeeklyStats).values({
              cannabisStrainId: strain.id,
              year,
              week,
              totalFavorites,
              pharmacyCount,
              productCount,
              avgPriceCents,
              priceChange,
              marketPenetration,
              totalPoints: 0, // Will be calculated by scoring engine
            });
          }

          calculated++;
        } catch (error) {
          console.error(`[CannabisStrainStats] Error calculating stats for strain ${strain.name}:`, error);
          errors++;
        }
      }

      console.log(`[CannabisStrainStats] Weekly stats calculation complete: ${calculated} strains processed, ${errors} errors`);
    } catch (error) {
      console.error('[CannabisStrainStats] Weekly stats calculation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate stats for a specific cannabis strain
   */
  async calculateStrainStats(cannabisStrainId: number, year: number, week: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const strain = await db
      .select()
      .from(cannabisStrains)
      .where(eq(cannabisStrains.id, cannabisStrainId))
      .limit(1);

    if (strain.length === 0) {
      throw new Error(`Cannabis strain ${cannabisStrainId} not found`);
    }

    // Get all products that use this cannabis strain
    const productsUsingStrain = await db
      .select()
      .from(products)
      .where(eq(products.strainId, cannabisStrainId));

    if (productsUsingStrain.length === 0) {
      console.log(`[CannabisStrainStats] No products found for strain ${strain[0].name}`);
      return;
    }

    // Calculate aggregate statistics
    const totalFavorites = productsUsingStrain.reduce((sum, p) => sum + p.favoriteCount, 0);
    const pharmacyCount = Math.max(...productsUsingStrain.map(p => p.pharmacyCount));
    const productCount = productsUsingStrain.length;
    const avgPriceCents = Math.floor(
      productsUsingStrain.reduce((sum, p) => sum + p.avgPriceCents, 0) / productCount
    );
    const priceChange = 0; // TODO: Calculate from historical data
    const totalProducts = await db.select({ count: sql<number>`count(*)` }).from(products);
    const marketPenetration = Math.floor((productCount / Number(totalProducts[0].count)) * 100);

    // Check if stats already exist
    const existingStats = await db
      .select()
      .from(cannabisStrainWeeklyStats)
      .where(
        sql`${cannabisStrainWeeklyStats.cannabisStrainId} = ${cannabisStrainId} 
            AND ${cannabisStrainWeeklyStats.year} = ${year} 
            AND ${cannabisStrainWeeklyStats.week} = ${week}`
      )
      .limit(1);

    if (existingStats.length > 0) {
      await db
        .update(cannabisStrainWeeklyStats)
        .set({
          totalFavorites,
          pharmacyCount,
          productCount,
          avgPriceCents,
          priceChange,
          marketPenetration,
        })
        .where(eq(cannabisStrainWeeklyStats.id, existingStats[0].id));
    } else {
      await db.insert(cannabisStrainWeeklyStats).values({
        cannabisStrainId,
        year,
        week,
        totalFavorites,
        pharmacyCount,
        productCount,
        avgPriceCents,
        priceChange,
        marketPenetration,
        totalPoints: 0,
      });
    }
  }
}

// Singleton instance
let cannabisStrainStatsCalculator: CannabisStrainStatsCalculator | null = null;

export function getCannabisStrainStatsCalculator(): CannabisStrainStatsCalculator {
  if (!cannabisStrainStatsCalculator) {
    cannabisStrainStatsCalculator = new CannabisStrainStatsCalculator();
  }
  return cannabisStrainStatsCalculator;
}
