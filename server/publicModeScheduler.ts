/**
 * Public Mode Scheduler
 * 
 * Handles daily synchronization of Metabase data for public mode entities:
 * - Legendary Strains
 * - Trending Strains
 * - Effect Categories
 * - Consumption Types
 * - Terpene Profiles
 * - Entity Stats
 */

import { getDb } from "./db";
import {
  publicLegendaryStrains,
  publicTrendingStrains,
  publicEffectCategories,
  publicConsumptionTypes,
  publicTerpeneProfiles,
  publicModeStats,
} from "../drizzle/publicModeSchema";
import {
  getAllPublicModeData,
  getEffectsStatsToday,
  getEffectsStatsYesterday,
  getGeneticsStatsToday,
  getGeneticsStatsYesterday,
  getThcStatsToday,
  getThcStatsYesterday,
  getProductTypeStatsToday,
  getProductTypeStatsYesterday,
  getTerpenesStatsToday,
  getTerpenesStatsYesterday,
  getStrainsRanked,
} from "./lib/metabase-public-mode";
import { calculateScore, ScoringInput, EntityType } from "./publicModeScoringEngine";
import { eq, and, sql } from "drizzle-orm";

/**
 * Sync legendary strains from top-ranked strains
 */
async function syncLegendaryStrains() {
  console.log('Syncing legendary strains...');
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const strainsRanked = await getStrainsRanked();
  
  // Consider top 50 strains as legendary candidates
  const legendaryStrainNames = strainsRanked.slice(0, 50).map(s => s.strainName);

  for (const strainName of legendaryStrainNames) {
    const strain = strainsRanked.find(s => s.strainName === strainName);
    if (!strain) continue;

    const slug = strainName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Check if strain exists
    const [existing] = await db
      .select()
      .from(publicLegendaryStrains)
      .where(eq(publicLegendaryStrains.slug, slug))
      .limit(1);

    if (existing) {
      // Update existing strain
      await db
        .update(publicLegendaryStrains)
        .set({
          totalOrders: strain.orderCount,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(publicLegendaryStrains.id, existing.id));
    } else {
      // Insert new strain
      // Determine tier based on rank
      let tier = 'classic';
      if (strain.rank <= 10) tier = 'legendary';
      else if (strain.rank <= 25) tier = 'elite';

      await db
        .insert(publicLegendaryStrains)
        .values({
          name: strainName,
          slug,
          tier,
          totalOrders: strain.orderCount,
          uniqueUsers: 0, // Will be updated by stats sync
          isActive: true,
        });
    }
  }

  console.log(`✅ Synced ${legendaryStrainNames.length} legendary strains`);
}

/**
 * Sync trending strains
 */
async function syncTrendingStrains(date: string) {
  console.log('Syncing trending strains...');
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const strainsToday = await getStrainsRanked();
  
  // Get yesterday's data for comparison
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDate = yesterday.toISOString().split('T')[0];

  // For now, we'll use today's data and calculate simple deltas
  // In production, you'd fetch yesterday's data from the database or Metabase
  
  for (const strain of strainsToday.slice(0, 100)) {
    const slug = strain.strainName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Get yesterday's data from database
    const [yesterdayData] = await db
      .select()
      .from(publicTrendingStrains)
      .where(
        and(
          eq(publicTrendingStrains.slug, slug),
          eq(publicTrendingStrains.snapshotDate, yesterdayDate)
        )
      )
      .limit(1);

    const yesterdayOrders = yesterdayData?.todayOrders || 0;
    const todayOrders = strain.orderCount;
    const delta = todayOrders - yesterdayOrders;
    const percentage = yesterdayOrders > 0 ? Math.round((delta / yesterdayOrders) * 100) : 0;

    // Calculate streak
    let streakDays = 0;
    if (delta > 0) {
      streakDays = (yesterdayData?.streakDays || 0) + 1;
    }

    // Calculate trend score (simplified)
    const trendScore = Math.max(0, 50 + percentage);

    await db
      .insert(publicTrendingStrains)
      .values({
        name: strain.strainName,
        slug,
        todayOrders,
        yesterdayOrders,
        weekOverWeekDelta: delta,
        weekOverWeekPercentage: percentage,
        uniqueUsers: 0, // Will be updated by stats sync
        trendScore,
        isViral: percentage > 50,
        streakDays,
        snapshotDate: date,
      })
      .onConflictDoNothing();
  }

  console.log(`✅ Synced ${strainsToday.length} trending strains`);
}

/**
 * Sync effect categories
 */
async function syncEffectCategories(date: string) {
  console.log('Syncing effect categories...');
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const effectsToday = await getEffectsStatsToday();
  const effectsYesterday = await getEffectsStatsYesterday();

  for (let i = 0; i < effectsToday.length; i++) {
    const effect = effectsToday[i];
    const yesterdayEffect = effectsYesterday.find(e => e.effectName === effect.effectName);
    
    const slug = effect.effectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const todayCount = effect.count;
    const yesterdayCount = yesterdayEffect?.count || 0;
    const delta = todayCount - yesterdayCount;
    const percentage = yesterdayCount > 0 ? Math.round((delta / yesterdayCount) * 100) : 0;

    await db
      .insert(publicEffectCategories)
      .values({
        effectName: effect.effectName,
        slug,
        todayCount,
        yesterdayCount,
        weekOverWeekDelta: delta,
        weekOverWeekPercentage: percentage,
        totalStrains: 0, // Would need additional data
        avgRating: 0, // Would need additional data
        popularityRank: i + 1,
        snapshotDate: date,
      })
      .onConflictDoNothing();
  }

  console.log(`✅ Synced ${effectsToday.length} effect categories`);
}

/**
 * Sync consumption types (genetics, THC, product types)
 */
async function syncConsumptionTypes(date: string) {
  console.log('Syncing consumption types...');
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Sync genetics
  const geneticsToday = await getGeneticsStatsToday();
  const geneticsYesterday = await getGeneticsStatsYesterday();

  for (const genetics of geneticsToday) {
    const yesterdayGenetics = geneticsYesterday.find(g => g.geneticsType === genetics.geneticsType);
    const slug = genetics.geneticsType.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const todayCount = genetics.count;
    const yesterdayCount = yesterdayGenetics?.count || 0;
    const delta = todayCount - yesterdayCount;
    const percentage = yesterdayCount > 0 ? Math.round((delta / yesterdayCount) * 100) : 0;

    await db
      .insert(publicConsumptionTypes)
      .values({
        categoryType: 'genetics',
        categoryValue: genetics.geneticsType,
        slug: `genetics-${slug}`,
        todayCount,
        yesterdayCount,
        weekOverWeekDelta: delta,
        weekOverWeekPercentage: percentage,
        marketSharePercentage: Math.round(genetics.percentage),
        totalProducts: 0,
        uniqueUsers: 0,
        snapshotDate: date,
      })
      .onConflictDoNothing();
  }

  // Sync THC levels
  const thcToday = await getThcStatsToday();
  const thcYesterday = await getThcStatsYesterday();

  for (const thc of thcToday) {
    const yesterdayThc = thcYesterday.find(t => t.thcRange === thc.thcRange);
    const slug = thc.thcRange.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const todayCount = thc.count;
    const yesterdayCount = yesterdayThc?.count || 0;
    const delta = todayCount - yesterdayCount;
    const percentage = yesterdayCount > 0 ? Math.round((delta / yesterdayCount) * 100) : 0;

    await db
      .insert(publicConsumptionTypes)
      .values({
        categoryType: 'thc',
        categoryValue: thc.thcRange,
        slug: `thc-${slug}`,
        todayCount,
        yesterdayCount,
        weekOverWeekDelta: delta,
        weekOverWeekPercentage: percentage,
        marketSharePercentage: Math.round(thc.percentage),
        totalProducts: 0,
        uniqueUsers: 0,
        snapshotDate: date,
      })
      .onConflictDoNothing();
  }

  // Sync product types
  const productTypeToday = await getProductTypeStatsToday();
  const productTypeYesterday = await getProductTypeStatsYesterday();

  for (const productType of productTypeToday) {
    const yesterdayProductType = productTypeYesterday.find(p => p.productType === productType.productType);
    const slug = productType.productType.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const todayCount = productType.count;
    const yesterdayCount = yesterdayProductType?.count || 0;
    const delta = todayCount - yesterdayCount;
    const percentage = yesterdayCount > 0 ? Math.round((delta / yesterdayCount) * 100) : 0;

    await db
      .insert(publicConsumptionTypes)
      .values({
        categoryType: 'productType',
        categoryValue: productType.productType,
        slug: `product-${slug}`,
        todayCount,
        yesterdayCount,
        weekOverWeekDelta: delta,
        weekOverWeekPercentage: percentage,
        marketSharePercentage: Math.round(productType.percentage),
        totalProducts: 0,
        uniqueUsers: 0,
        snapshotDate: date,
      })
      .onConflictDoNothing();
  }

  console.log(`✅ Synced consumption types (genetics, THC, product types)`);
}

/**
 * Sync terpene profiles
 */
async function syncTerpeneProfiles(date: string) {
  console.log('Syncing terpene profiles...');
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const terpenesToday = await getTerpenesStatsToday();
  const terpenesYesterday = await getTerpenesStatsYesterday();

  for (let i = 0; i < terpenesToday.length; i++) {
    const terpene = terpenesToday[i];
    const yesterdayTerpene = terpenesYesterday.find(t => t.terpeneName === terpene.terpeneName);
    
    const slug = terpene.terpeneName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const todayCount = terpene.count;
    const yesterdayCount = yesterdayTerpene?.count || 0;
    const delta = todayCount - yesterdayCount;
    const percentage = yesterdayCount > 0 ? Math.round((delta / yesterdayCount) * 100) : 0;

    await db
      .insert(publicTerpeneProfiles)
      .values({
        terpeneName: terpene.terpeneName,
        slug,
        todayCount,
        yesterdayCount,
        weekOverWeekDelta: delta,
        weekOverWeekPercentage: percentage,
        totalStrains: 0,
        popularityRank: i + 1,
        uniqueUsers: 0,
        snapshotDate: date,
      })
      .onConflictDoNothing();
  }

  console.log(`✅ Synced ${terpenesToday.length} terpene profiles`);
}

/**
 * Calculate and sync entity stats
 */
async function syncEntityStats(date: string) {
  console.log('Calculating entity stats...');
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // This is a simplified implementation
  // In production, you would:
  // 1. Fetch all entities for each type
  // 2. Calculate max values for normalization
  // 3. Calculate scores using the scoring engine
  // 4. Insert/update stats in publicModeStats table

  console.log('⚠️  Entity stats calculation is a placeholder - implement based on real data');
}

/**
 * Main sync function
 */
export async function syncPublicModeData(date?: string) {
  const syncDate = date || new Date().toISOString().split('T')[0];
  
  console.log('='.repeat(60));
  console.log('Public Mode Data Sync');
  console.log(`Date: ${syncDate}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    await syncLegendaryStrains();
    await syncTrendingStrains(syncDate);
    await syncEffectCategories(syncDate);
    await syncConsumptionTypes(syncDate);
    await syncTerpeneProfiles(syncDate);
    await syncEntityStats(syncDate);

    console.log('');
    console.log('='.repeat(60));
    console.log('✅ Public Mode Data Sync Complete!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('');
    console.error('❌ Public Mode Data Sync Failed!');
    console.error('Error:', error);
    throw error;
  }
}

/**
 * Schedule daily sync
 * This can be called from a cron job or scheduled task
 */
export async function scheduleDailySync() {
  // Run sync every day at 2 AM
  const now = new Date();
  const nextRun = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    2, // 2 AM
    0,
    0
  );

  const msUntilNextRun = nextRun.getTime() - now.getTime();

  console.log(`Scheduling next sync for ${nextRun.toISOString()}`);

  setTimeout(async () => {
    await syncPublicModeData();
    // Schedule next run
    scheduleDailySync();
  }, msUntilNextRun);
}

// If running as a standalone script
if (require.main === module) {
  syncPublicModeData()
    .then(() => {
      console.log('Exiting...');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
