import { getDb } from './db';
import {
  dailyMatchups,
  userPredictions,
  users,
  manufacturers,
  cannabisStrains,
  brands,
  pharmacies,
  manufacturerDailyStats,
  cannabisStrainDailyStats,
  brandDailyStats,
  pharmacyDailyStats,
} from '../drizzle/schema';
import { eq, and, desc, isNotNull, sql } from 'drizzle-orm';

interface EntityData {
  id: number;
  name: string;
  recentPoints: number;
}

interface MatchupPair {
  entityA: EntityData;
  entityB: EntityData;
}

export async function generateDailyMatchups(): Promise<void> {
  console.log('[PredictionService] Generating daily matchups...');

  const db = await getDb();
  if (!db) {
    console.error('[PredictionService] Database not available');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    const existing = await db
      .select()
      .from(dailyMatchups)
      .where(eq(dailyMatchups.matchupDate, today))
      .limit(1);

    if (existing.length > 0) {
      console.log('[PredictionService] Matchups already exist for today');
      return;
    }

    const manufacturerPairs = await generateManufacturerMatchups(2);
    const strainPairs = await generateStrainMatchups(2);
    const brandPairs = await generateBrandMatchups(2);
    const pharmacyPairs = await generatePharmacyMatchups(1);

    const allPairs = [
      ...manufacturerPairs.map(p => ({ ...p, type: 'manufacturer' as const })),
      ...strainPairs.map(p => ({ ...p, type: 'strain' as const })),
      ...brandPairs.map(p => ({ ...p, type: 'brand' as const })),
      ...pharmacyPairs.map(p => ({ ...p, type: 'pharmacy' as const })),
    ];

    for (const pair of allPairs) {
      await db.insert(dailyMatchups).values({
        matchupDate: today,
        entityType: pair.type,
        entityAId: pair.entityA.id,
        entityBId: pair.entityB.id,
        entityAName: pair.entityA.name,
        entityBName: pair.entityB.name,
        isScored: false,
      });
    }

    console.log(`[PredictionService] Generated ${allPairs.length} matchups for ${today}`);
  } catch (error) {
    console.error('[PredictionService] Error generating matchups:', error);
  }
}

function hasNonEmptyUrl(column: any) {
  return and(
    isNotNull(column),
    sql`btrim(${column}) <> ''`
  );
}

async function generateManufacturerMatchups(count: number): Promise<MatchupPair[]> {
  const db = await getDb();
  if (!db) return [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const topManufacturers = await db
    .select({
      id: manufacturers.id,
      name: manufacturers.name,
      points: manufacturerDailyStats.totalPoints,
    })
    .from(manufacturers)
    .innerJoin(
      manufacturerDailyStats,
      eq(manufacturers.id, manufacturerDailyStats.manufacturerId)
    )
    .where(and(
      eq(manufacturerDailyStats.statDate, yesterdayStr),
      hasNonEmptyUrl(manufacturers.logoUrl)
    ))
    .orderBy(desc(manufacturerDailyStats.totalPoints))
    .limit(20);

  // Fallback: if not enough manufacturers with stats, select random ones
  let entitiesToUse = topManufacturers;
  if (topManufacturers.length < count * 2) {
    console.warn('[PredictionService] Not enough manufacturers with stats, using random selection');
    const allManufacturers = await db
      .select({
        id: manufacturers.id,
        name: manufacturers.name,
      })
      .from(manufacturers)
      .where(hasNonEmptyUrl(manufacturers.logoUrl))
      .limit(100);

    if (allManufacturers.length < count * 2) {
      console.warn('[PredictionService] Not enough manufacturers in database');
      return [];
    }

    entitiesToUse = allManufacturers.map(m => ({ ...m, points: 0 }));
  }

  if (entitiesToUse.length < count * 2) {
    console.warn(`[PredictionService] Only ${entitiesToUse.length} manufacturers have images; generating ${Math.floor(entitiesToUse.length / 2)} matchups`);
  }

  const shuffled = entitiesToUse.sort(() => Math.random() - 0.5);
  const pairs: MatchupPair[] = [];

  for (let i = 0; i < count * 2; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push({
        entityA: {
          id: shuffled[i].id,
          name: shuffled[i].name,
          recentPoints: shuffled[i].points || 0,
        },
        entityB: {
          id: shuffled[i + 1].id,
          name: shuffled[i + 1].name,
          recentPoints: shuffled[i + 1].points || 0,
        },
      });
    }
  }

  return pairs;
}

async function generateStrainMatchups(count: number): Promise<MatchupPair[]> {
  const db = await getDb();
  if (!db) return [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const topStrains = await db
    .select({
      id: cannabisStrains.id,
      name: cannabisStrains.name,
      points: cannabisStrainDailyStats.totalPoints,
    })
    .from(cannabisStrains)
    .innerJoin(
      cannabisStrainDailyStats,
      eq(cannabisStrains.id, cannabisStrainDailyStats.cannabisStrainId)
    )
    .where(and(
      eq(cannabisStrainDailyStats.statDate, yesterdayStr),
      hasNonEmptyUrl(cannabisStrains.imageUrl)
    ))
    .orderBy(desc(cannabisStrainDailyStats.totalPoints))
    .limit(20);

  // Fallback: if not enough strains with stats, select random ones
  let entitiesToUse = topStrains;
  if (topStrains.length < count * 2) {
    console.warn('[PredictionService] Not enough strains with stats, using random selection');
    const allStrains = await db
      .select({
        id: cannabisStrains.id,
        name: cannabisStrains.name,
      })
      .from(cannabisStrains)
      .where(hasNonEmptyUrl(cannabisStrains.imageUrl))
      .limit(100);

    if (allStrains.length < count * 2) {
      console.warn('[PredictionService] Not enough strains in database');
      return [];
    }

    entitiesToUse = allStrains.map(s => ({ ...s, points: 0 }));
  }

  if (entitiesToUse.length < count * 2) {
    console.warn(`[PredictionService] Only ${entitiesToUse.length} strains have images; generating ${Math.floor(entitiesToUse.length / 2)} matchups`);
  }

  const shuffled = entitiesToUse.sort(() => Math.random() - 0.5);
  const pairs: MatchupPair[] = [];

  for (let i = 0; i < count * 2; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push({
        entityA: {
          id: shuffled[i].id,
          name: shuffled[i].name,
          recentPoints: shuffled[i].points || 0,
        },
        entityB: {
          id: shuffled[i + 1].id,
          name: shuffled[i + 1].name,
          recentPoints: shuffled[i + 1].points || 0,
        },
      });
    }
  }

  return pairs;
}

async function generateBrandMatchups(count: number): Promise<MatchupPair[]> {
  const db = await getDb();
  if (!db) return [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const topBrands = await db
    .select({
      id: brands.id,
      name: brands.name,
      points: brandDailyStats.totalPoints,
    })
    .from(brands)
    .innerJoin(
      brandDailyStats,
      eq(brands.id, brandDailyStats.brandId)
    )
    .where(and(
      eq(brandDailyStats.statDate, yesterdayStr),
      hasNonEmptyUrl(brands.logoUrl)
    ))
    .orderBy(desc(brandDailyStats.totalPoints))
    .limit(20);

  // Fallback: if not enough brands with stats, select random ones
  let entitiesToUse = topBrands;
  if (topBrands.length < count * 2) {
    console.warn('[PredictionService] Not enough brands with stats, using random selection');
    const allBrands = await db
      .select({
        id: brands.id,
        name: brands.name,
      })
      .from(brands)
      .where(hasNonEmptyUrl(brands.logoUrl))
      .limit(100);

    if (allBrands.length < count * 2) {
      console.warn('[PredictionService] Not enough brands in database');
      return [];
    }

    entitiesToUse = allBrands.map(b => ({ ...b, points: 0 }));
  }

  if (entitiesToUse.length < count * 2) {
    console.warn(`[PredictionService] Only ${entitiesToUse.length} brands have images; generating ${Math.floor(entitiesToUse.length / 2)} matchups`);
  }

  const shuffled = entitiesToUse.sort(() => Math.random() - 0.5);
  const pairs: MatchupPair[] = [];

  for (let i = 0; i < count * 2; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push({
        entityA: {
          id: shuffled[i].id,
          name: shuffled[i].name,
          recentPoints: shuffled[i].points || 0,
        },
        entityB: {
          id: shuffled[i + 1].id,
          name: shuffled[i + 1].name,
          recentPoints: shuffled[i + 1].points || 0,
        },
      });
    }
  }

  return pairs;
}

async function generatePharmacyMatchups(count: number): Promise<MatchupPair[]> {
  const db = await getDb();
  if (!db) return [];

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const topPharmacies = await db
    .select({
      id: pharmacies.id,
      name: pharmacies.name,
      points: pharmacyDailyStats.totalPoints,
    })
    .from(pharmacies)
    .innerJoin(
      pharmacyDailyStats,
      eq(pharmacies.id, pharmacyDailyStats.pharmacyId)
    )
    .where(and(
      eq(pharmacyDailyStats.statDate, yesterdayStr),
      hasNonEmptyUrl(pharmacies.logoUrl)
    ))
    .orderBy(desc(pharmacyDailyStats.totalPoints))
    .limit(20);

  // Fallback: if not enough pharmacies with stats, select random ones
  let entitiesToUse = topPharmacies;
  if (topPharmacies.length < count * 2) {
    console.warn('[PredictionService] Not enough pharmacies with stats, using random selection');
    const allPharmacies = await db
      .select({
        id: pharmacies.id,
        name: pharmacies.name,
      })
      .from(pharmacies)
      .where(hasNonEmptyUrl(pharmacies.logoUrl))
      .limit(100);

    if (allPharmacies.length < count * 2) {
      console.warn('[PredictionService] Not enough pharmacies in database');
      return [];
    }

    entitiesToUse = allPharmacies.map(p => ({ ...p, points: 0 }));
  }

  if (entitiesToUse.length < count * 2) {
    console.warn(`[PredictionService] Only ${entitiesToUse.length} pharmacies have images; generating ${Math.floor(entitiesToUse.length / 2)} matchups`);
  }

  const shuffled = entitiesToUse.sort(() => Math.random() - 0.5);
  const pairs: MatchupPair[] = [];

  for (let i = 0; i < count * 2; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push({
        entityA: {
          id: shuffled[i].id,
          name: shuffled[i].name,
          recentPoints: shuffled[i].points || 0,
        },
        entityB: {
          id: shuffled[i + 1].id,
          name: shuffled[i + 1].name,
          recentPoints: shuffled[i + 1].points || 0,
        },
      });
    }
  }

  return pairs;
}

export async function scorePreviousDayMatchups(): Promise<void> {
  console.log('[PredictionService] Scoring previous day matchups...');

  const db = await getDb();
  if (!db) {
    console.error('[PredictionService] Database not available');
    return;
  }

  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const matchups = await db
      .select()
      .from(dailyMatchups)
      .where(
        and(
          eq(dailyMatchups.matchupDate, yesterdayStr),
          eq(dailyMatchups.isScored, false)
        )
      );

    console.log(`[PredictionService] Found ${matchups.length} matchups to score`);

    for (const matchup of matchups) {
      await scoreMatchup(matchup);
    }

    console.log('[PredictionService] Finished scoring matchups');
  } catch (error) {
    console.error('[PredictionService] Error scoring matchups:', error);
  }
}

async function scoreMatchup(matchup: any): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    let entityAPoints = 0;
    let entityBPoints = 0;

    if (matchup.entityType === 'manufacturer') {
      const statsA = await db
        .select()
        .from(manufacturerDailyStats)
        .where(and(
          eq(manufacturerDailyStats.manufacturerId, matchup.entityAId),
          eq(manufacturerDailyStats.statDate, matchup.matchupDate)
        ))
        .limit(1);

      const statsB = await db
        .select()
        .from(manufacturerDailyStats)
        .where(and(
          eq(manufacturerDailyStats.manufacturerId, matchup.entityBId),
          eq(manufacturerDailyStats.statDate, matchup.matchupDate)
        ))
        .limit(1);

      if (!statsA[0]) {
        console.warn(`[PredictionService] No stats found for manufacturer ${matchup.entityAName} (ID: ${matchup.entityAId}) on ${matchup.matchupDate}`);
      }
      if (!statsB[0]) {
        console.warn(`[PredictionService] No stats found for manufacturer ${matchup.entityBName} (ID: ${matchup.entityBId}) on ${matchup.matchupDate}`);
      }

      // Calculate points from stats data (totalPoints is always 0 in daily stats)
      if (statsA[0]) {
        const sales = statsA[0].salesVolumeGrams || 0;
        const products = statsA[0].productCount || 0;
        const rank = statsA[0].marketShareRank || 999;
        const rankBonus = rank <= 10 ? (11 - rank) * 5 : 0;
        entityAPoints = Math.floor(sales / 10) + (products * 3) + rankBonus;
      }
      if (statsB[0]) {
        const sales = statsB[0].salesVolumeGrams || 0;
        const products = statsB[0].productCount || 0;
        const rank = statsB[0].marketShareRank || 999;
        const rankBonus = rank <= 10 ? (11 - rank) * 5 : 0;
        entityBPoints = Math.floor(sales / 10) + (products * 3) + rankBonus;
      }
    }
    else if (matchup.entityType === 'strain') {
      const statsA = await db
        .select()
        .from(cannabisStrainDailyStats)
        .where(and(
          eq(cannabisStrainDailyStats.cannabisStrainId, matchup.entityAId),
          eq(cannabisStrainDailyStats.statDate, matchup.matchupDate)
        ))
        .limit(1);

      const statsB = await db
        .select()
        .from(cannabisStrainDailyStats)
        .where(and(
          eq(cannabisStrainDailyStats.cannabisStrainId, matchup.entityBId),
          eq(cannabisStrainDailyStats.statDate, matchup.matchupDate)
        ))
        .limit(1);

      if (!statsA[0]) {
        console.warn(`[PredictionService] No stats found for strain ${matchup.entityAName} (ID: ${matchup.entityAId}) on ${matchup.matchupDate}`);
      }
      if (!statsB[0]) {
        console.warn(`[PredictionService] No stats found for strain ${matchup.entityBName} (ID: ${matchup.entityBId}) on ${matchup.matchupDate}`);
      }

      // Calculate points from stats data (totalPoints is always 0 in daily stats)
      if (statsA[0]) {
        const favorites = statsA[0].totalFavorites || 0;
        const pharmacies = statsA[0].pharmacyCount || 0;
        const penetration = statsA[0].marketPenetration || 0;
        entityAPoints = (favorites * 2) + (pharmacies * 5) + penetration;
      }
      if (statsB[0]) {
        const favorites = statsB[0].totalFavorites || 0;
        const pharmacies = statsB[0].pharmacyCount || 0;
        const penetration = statsB[0].marketPenetration || 0;
        entityBPoints = (favorites * 2) + (pharmacies * 5) + penetration;
      }
    }
    else if (matchup.entityType === 'brand') {
      const statsA = await db
        .select()
        .from(brandDailyStats)
        .where(and(
          eq(brandDailyStats.brandId, matchup.entityAId),
          eq(brandDailyStats.statDate, matchup.matchupDate)
        ))
        .limit(1);

      const statsB = await db
        .select()
        .from(brandDailyStats)
        .where(and(
          eq(brandDailyStats.brandId, matchup.entityBId),
          eq(brandDailyStats.statDate, matchup.matchupDate)
        ))
        .limit(1);

      if (!statsA[0]) {
        console.warn(`[PredictionService] No stats found for brand ${matchup.entityAName} (ID: ${matchup.entityAId}) on ${matchup.matchupDate}`);
      }
      if (!statsB[0]) {
        console.warn(`[PredictionService] No stats found for brand ${matchup.entityBName} (ID: ${matchup.entityBId}) on ${matchup.matchupDate}`);
      }

      // Calculate points from stats data (totalPoints is always 0 in daily stats)
      if (statsA[0]) {
        const favorites = statsA[0].favorites || 0;
        const views = statsA[0].views || 0;
        const comments = statsA[0].comments || 0;
        const clicks = statsA[0].affiliateClicks || 0;
        entityAPoints = (favorites * 2) + Math.floor(views / 10) + (comments * 5) + (clicks * 3);
      }
      if (statsB[0]) {
        const favorites = statsB[0].favorites || 0;
        const views = statsB[0].views || 0;
        const comments = statsB[0].comments || 0;
        const clicks = statsB[0].affiliateClicks || 0;
        entityBPoints = (favorites * 2) + Math.floor(views / 10) + (comments * 5) + (clicks * 3);
      }
    }
    else if (matchup.entityType === 'pharmacy') {
      const statsA = await db
        .select()
        .from(pharmacyDailyStats)
        .where(and(
          eq(pharmacyDailyStats.pharmacyId, matchup.entityAId),
          eq(pharmacyDailyStats.statDate, matchup.matchupDate)
        ))
        .limit(1);

      const statsB = await db
        .select()
        .from(pharmacyDailyStats)
        .where(and(
          eq(pharmacyDailyStats.pharmacyId, matchup.entityBId),
          eq(pharmacyDailyStats.statDate, matchup.matchupDate)
        ))
        .limit(1);

      if (!statsA[0]) {
        console.warn(`[PredictionService] No stats found for pharmacy ${matchup.entityAName} (ID: ${matchup.entityAId}) on ${matchup.matchupDate}`);
      }
      if (!statsB[0]) {
        console.warn(`[PredictionService] No stats found for pharmacy ${matchup.entityBName} (ID: ${matchup.entityBId}) on ${matchup.matchupDate}`);
      }

      // Calculate points from stats data (totalPoints is always 0 in daily stats)
      if (statsA[0]) {
        const orders = statsA[0].orderCount || 0;
        const revenue = statsA[0].revenueCents || 0;
        const rating = statsA[0].customerRating || 0;
        entityAPoints = (orders * 2) + Math.floor(revenue / 1000) + (rating * 10);
      }
      if (statsB[0]) {
        const orders = statsB[0].orderCount || 0;
        const revenue = statsB[0].revenueCents || 0;
        const rating = statsB[0].customerRating || 0;
        entityBPoints = (orders * 2) + Math.floor(revenue / 1000) + (rating * 10);
      }
    }

    // Check if we have valid stats data
    if (entityAPoints === 0 && entityBPoints === 0) {
      console.warn(`[PredictionService] No stats found for matchup ${matchup.id} on ${matchup.matchupDate}, skipping scoring`);
      return; // Don't score matchups without data
    }

    // Determine winner - use strict > to avoid bias in ties
    // In case of a tie with non-zero scores, Entity A wins (rare case)
    const winnerId = entityAPoints > entityBPoints
      ? matchup.entityAId
      : matchup.entityBId;

    // Update predictions FIRST. If this fails, the matchup won't be marked as scored,
    // allowing the job to retry later.
    await updateUserPredictionsForMatchup(matchup.id, winnerId, matchup.matchupDate);

    await db.update(dailyMatchups)
      .set({
        winnerId,
        entityAPoints,
        entityBPoints,
        isScored: true
      })
      .where(eq(dailyMatchups.id, matchup.id));

    console.log(`[PredictionService] Scored matchup ${matchup.id}: ${matchup.entityAName} (${entityAPoints}) vs ${matchup.entityBName} (${entityBPoints}) - Winner: ${winnerId}`);
  } catch (error) {
    console.error(`[PredictionService] Error scoring matchup ${matchup.id}:`, error);
  }
}

export async function updateUserPredictionsForMatchup(
  matchupId: number,
  winnerId: number,
  matchupDate: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const predictions = await db
      .select()
      .from(userPredictions)
      .where(eq(userPredictions.matchupId, matchupId));

    for (const prediction of predictions) {
      const isCorrect = prediction.predictedWinnerId === winnerId;

      // Idempotency check
      if (prediction.isCorrect === isCorrect) {
        continue;
      }

      await db
        .update(userPredictions)
        .set({ isCorrect })
        .where(eq(userPredictions.id, prediction.id));

      await updateUserStreak(prediction.userId, isCorrect, matchupDate, prediction.isDoubleDown);
    }
  } catch (error) {
    console.error(`[PredictionService] Error updating predictions for matchup ${matchupId}:`, error);
  }
}

export async function updateUserStreak(
  userId: number,
  wasCorrect: boolean,
  matchupDate: string,
  isDoubleDown: boolean = false
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return;

    let newStreak: number;

    if (wasCorrect) {
      const increment = isDoubleDown ? 2 : 1;
      newStreak = (user.currentPredictionStreak || 0) + increment;

      // If Double Down was successful, consume the token
      if (isDoubleDown) {
        await db
          .update(users)
          .set({
            doubleDownTokens: sql`${users.doubleDownTokens} - 1`,
          })
          .where(and(eq(users.id, userId), sql`${users.doubleDownTokens} > 0`));
      }
    } else {
      newStreak = 0;
    }

    const newLongest = Math.max(
      newStreak,
      user.longestPredictionStreak || 0
    );

    await db.update(users)
      .set({
        currentPredictionStreak: newStreak,
        longestPredictionStreak: newLongest,
      })
      .where(eq(users.id, userId));

    console.log(`[PredictionService] Updated user ${userId} streak: ${newStreak} (longest: ${newLongest})`);
  } catch (error) {
    console.error(`[PredictionService] Error updating streak for user ${userId}:`, error);
  }
}

export default {
  generateDailyMatchups,
  scorePreviousDayMatchups,
};
