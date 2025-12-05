/**
 * Public Mode Scheduler - Database Version
 * 
 * Populates public mode tables from existing database data instead of Metabase.
 * Uses: cannabisStrains, strainDailyChallengeStats, etc.
 */

import { getDb } from "./db";
import {
  publicLegendaryStrains,
  publicTrendingStrains,
  publicEffectCategories,
  publicConsumptionTypes,
  publicTerpeneProfiles,
} from "../drizzle/publicModeSchema";
import { cannabisStrains } from "../drizzle/schema";
import { strainDailyChallengeStats } from "../drizzle/dailyChallengeSchema";
import { eq, desc, sql, and, ne, isNotNull } from "drizzle-orm";

/**
 * Sync legendary strains from cannabisStrains table
 * Top strains become "legendary" 
 */
async function syncLegendaryStrains() {
  console.log('Syncing legendary strains from database...');
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get top strains with product counts
  const topStrains = await db
    .select({
      id: cannabisStrains.id,
      name: cannabisStrains.name,
      slug: cannabisStrains.slug,
      description: cannabisStrains.description,
      imageUrl: cannabisStrains.imageUrl,
      type: cannabisStrains.type,
      thcMin: cannabisStrains.thcMin,
      thcMax: cannabisStrains.thcMax,
      terpenes: cannabisStrains.terpenes,
      productCount: cannabisStrains.pharmaceuticalProductCount,
    })
    .from(cannabisStrains)
    .where(isNotNull(cannabisStrains.name))
    .orderBy(desc(cannabisStrains.pharmaceuticalProductCount))
    .limit(50);

  let count = 0;
  for (const strain of topStrains) {
    if (!strain.name) continue;

    const slug = strain.slug || strain.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Determine tier based on rank
    let tier = 'classic';
    if (count < 10) tier = 'legendary';
    else if (count < 25) tier = 'elite';

    // Get THC range string
    const thcRange = strain.thcMin && strain.thcMax
      ? `${strain.thcMin}-${strain.thcMax}%`
      : strain.thcMax ? `${strain.thcMax}%` : undefined;

    // Parse terpenes if available
    let dominantTerpenes = null;
    if (strain.terpenes) {
      try {
        const parsed = JSON.parse(strain.terpenes);
        if (Array.isArray(parsed)) {
          dominantTerpenes = parsed.slice(0, 3).join(', ');
        }
      } catch (e) {
        // If it's a string, use it directly
        if (typeof strain.terpenes === 'string') {
          dominantTerpenes = strain.terpenes;
        }
      }
    }

    // Upsert into publicLegendaryStrains
    await db
      .insert(publicLegendaryStrains)
      .values({
        name: strain.name,
        slug,
        description: strain.description,
        tier,
        imageUrl: strain.imageUrl,
        genetics: strain.type,
        thcRange,
        dominantTerpenes,
        totalOrders: strain.productCount || 0,
        uniqueUsers: 0,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: publicLegendaryStrains.slug,
        set: {
          totalOrders: strain.productCount || 0,
          updatedAt: new Date().toISOString(),
        },
      });

    count++;
  }

  console.log(`✅ Synced ${count} legendary strains`);
}

/**
 * Sync trending strains from strainDailyChallengeStats
 */
async function syncTrendingStrains(date: string) {
  console.log('Syncing trending strains from database...');
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get strains with recent stats
  const trendingData = await db
    .select({
      strainId: strainDailyChallengeStats.strainId,
      orderCount: strainDailyChallengeStats.orderCount,
      totalPoints: strainDailyChallengeStats.totalPoints,
      rank: strainDailyChallengeStats.rank,
      strainName: cannabisStrains.name,
      strainSlug: cannabisStrains.slug,
      strainImage: cannabisStrains.imageUrl,
      strainDescription: cannabisStrains.description,
      genetics: cannabisStrains.type,
      thcMax: cannabisStrains.thcMax,
      terpenes: cannabisStrains.terpenes,
    })
    .from(strainDailyChallengeStats)
    .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
    .where(eq(strainDailyChallengeStats.statDate, date))
    .orderBy(desc(strainDailyChallengeStats.orderCount))
    .limit(100);

  let count = 0;
  for (const data of trendingData) {
    if (!data.strainName) continue;

    const slug = data.strainSlug || data.strainName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Calculate trend score based on rank and orders
    const trendScore = Math.max(0, 100 - (data.rank || 50) + Math.min(50, data.orderCount || 0));
    const isViral = trendScore > 80;

    await db
      .insert(publicTrendingStrains)
      .values({
        name: data.strainName,
        slug,
        description: data.strainDescription,
        imageUrl: data.strainImage,
        genetics: data.genetics,
        thcRange: data.thcMax ? `${data.thcMax}%` : undefined,
        dominantTerpenes: data.terpenes,
        todayOrders: data.orderCount || 0,
        yesterdayOrders: 0,
        weekOverWeekDelta: 0,
        weekOverWeekPercentage: 0,
        uniqueUsers: 0,
        trendScore,
        isViral,
        streakDays: 0,
        snapshotDate: date,
      })
      .onConflictDoNothing();

    count++;
  }

  console.log(`✅ Synced ${count} trending strains`);
}

/**
 * Sync effect categories from cannabisStrains.effects
 */
async function syncEffectCategories(date: string) {
  console.log('Syncing effect categories from database...');
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get strains with effects
  const strainsWithEffects = await db
    .select({
      effects: cannabisStrains.effects,
    })
    .from(cannabisStrains)
    .where(isNotNull(cannabisStrains.effects))
    .limit(1000);

  // Count effect occurrences
  const effectCounts: Record<string, number> = {};
  for (const strain of strainsWithEffects) {
    if (!strain.effects) continue;

    try {
      const effects = JSON.parse(strain.effects);
      if (Array.isArray(effects)) {
        for (const effect of effects) {
          const effectName = String(effect).trim();
          if (effectName) {
            effectCounts[effectName] = (effectCounts[effectName] || 0) + 1;
          }
        }
      }
    } catch (e) {
      // Try as comma-separated string
      const effects = strain.effects.split(',').map(e => e.trim()).filter(Boolean);
      for (const effect of effects) {
        effectCounts[effect] = (effectCounts[effect] || 0) + 1;
      }
    }
  }

  // Sort by count and insert
  const sortedEffects = Object.entries(effectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  let rank = 1;
  for (const [effectName, count] of sortedEffects) {
    const slug = effectName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await db
      .insert(publicEffectCategories)
      .values({
        effectName,
        slug,
        todayCount: count,
        yesterdayCount: 0,
        weekOverWeekDelta: 0,
        weekOverWeekPercentage: 0,
        totalStrains: count,
        avgRating: 0,
        popularityRank: rank,
        snapshotDate: date,
      })
      .onConflictDoNothing();

    rank++;
  }

  console.log(`✅ Synced ${sortedEffects.length} effect categories`);
}

/**
 * Sync consumption types (genetics types from cannabisStrains.type)
 */
async function syncConsumptionTypes(date: string) {
  console.log('Syncing consumption types from database...');
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get genetics type counts
  const geneticsData = await db
    .select({
      type: cannabisStrains.type,
      count: sql<number>`count(*)`,
    })
    .from(cannabisStrains)
    .where(isNotNull(cannabisStrains.type))
    .groupBy(cannabisStrains.type)
    .orderBy(desc(sql`count(*)`));

  const totalCount = geneticsData.reduce((sum, g) => sum + Number(g.count), 0);

  for (const genetics of geneticsData) {
    if (!genetics.type) continue;

    const slug = `genetics-${genetics.type.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const count = Number(genetics.count);
    const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;

    await db
      .insert(publicConsumptionTypes)
      .values({
        categoryType: 'genetics',
        categoryValue: genetics.type,
        slug,
        todayCount: count,
        yesterdayCount: 0,
        weekOverWeekDelta: 0,
        weekOverWeekPercentage: 0,
        marketSharePercentage: percentage,
        totalProducts: count,
        uniqueUsers: 0,
        snapshotDate: date,
      })
      .onConflictDoNothing();
  }

  console.log(`✅ Synced ${geneticsData.length} consumption types`);
}

/**
 * Sync terpene profiles from cannabisStrains.terpenes
 */
async function syncTerpeneProfiles(date: string) {
  console.log('Syncing terpene profiles from database...');
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get strains with terpenes
  const strainsWithTerpenes = await db
    .select({
      terpenes: cannabisStrains.terpenes,
    })
    .from(cannabisStrains)
    .where(isNotNull(cannabisStrains.terpenes))
    .limit(1000);

  // Count terpene occurrences
  const terpeneCounts: Record<string, number> = {};
  for (const strain of strainsWithTerpenes) {
    if (!strain.terpenes) continue;

    try {
      const terpenes = JSON.parse(strain.terpenes);
      if (Array.isArray(terpenes)) {
        for (const terpene of terpenes) {
          const terpeneName = String(terpene).trim();
          if (terpeneName) {
            terpeneCounts[terpeneName] = (terpeneCounts[terpeneName] || 0) + 1;
          }
        }
      }
    } catch (e) {
      // Try as comma-separated string
      const terpenes = strain.terpenes.split(',').map(t => t.trim()).filter(Boolean);
      for (const terpene of terpenes) {
        terpeneCounts[terpene] = (terpeneCounts[terpene] || 0) + 1;
      }
    }
  }

  // Sort by count and insert
  const sortedTerpenes = Object.entries(terpeneCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);

  let rank = 1;
  for (const [terpeneName, count] of sortedTerpenes) {
    const slug = terpeneName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await db
      .insert(publicTerpeneProfiles)
      .values({
        terpeneName,
        slug,
        todayCount: count,
        yesterdayCount: 0,
        weekOverWeekDelta: 0,
        weekOverWeekPercentage: 0,
        totalStrains: count,
        popularityRank: rank,
        uniqueUsers: 0,
        snapshotDate: date,
      })
      .onConflictDoNothing();

    rank++;
  }

  console.log(`✅ Synced ${sortedTerpenes.length} terpene profiles`);
}

/**
 * Main sync function
 */
export async function syncPublicModeData(date?: string) {
  const syncDate = date || new Date().toISOString().split('T')[0];

  console.log('='.repeat(60));
  console.log('Public Mode Data Sync (Database)');
  console.log(`Date: ${syncDate}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    await syncLegendaryStrains();
    await syncTrendingStrains(syncDate);
    await syncEffectCategories(syncDate);
    await syncConsumptionTypes(syncDate);
    await syncTerpeneProfiles(syncDate);

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
 */
export async function scheduleDailySync() {
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
    scheduleDailySync();
  }, msUntilNextRun);
}

// If running as a standalone script (ESM compatible)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
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
