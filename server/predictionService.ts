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
import { eq, and, desc } from 'drizzle-orm';

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
        isScored: 0,
      });
    }

    console.log(`[PredictionService] Generated ${allPairs.length} matchups for ${today}`);
  } catch (error) {
    console.error('[PredictionService] Error generating matchups:', error);
  }
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
    .where(eq(manufacturerDailyStats.statDate, yesterdayStr))
    .orderBy(desc(manufacturerDailyStats.totalPoints))
    .limit(20);

  if (topManufacturers.length < count * 2) {
    console.warn('[PredictionService] Not enough manufacturers for matchups');
    return [];
  }

  const shuffled = topManufacturers.sort(() => Math.random() - 0.5);
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
    .where(eq(cannabisStrainDailyStats.statDate, yesterdayStr))
    .orderBy(desc(cannabisStrainDailyStats.totalPoints))
    .limit(20);

  if (topStrains.length < count * 2) {
    console.warn('[PredictionService] Not enough strains for matchups');
    return [];
  }

  const shuffled = topStrains.sort(() => Math.random() - 0.5);
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
    .where(eq(brandDailyStats.statDate, yesterdayStr))
    .orderBy(desc(brandDailyStats.totalPoints))
    .limit(20);

  if (topBrands.length < count * 2) {
    console.warn('[PredictionService] Not enough brands for matchups');
    return [];
  }

  const shuffled = topBrands.sort(() => Math.random() - 0.5);
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
    .where(eq(pharmacyDailyStats.statDate, yesterdayStr))
    .orderBy(desc(pharmacyDailyStats.totalPoints))
    .limit(20);

  if (topPharmacies.length < count * 2) {
    console.warn('[PredictionService] Not enough pharmacies for matchups');
    return [];
  }

  const shuffled = topPharmacies.sort(() => Math.random() - 0.5);
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
      .where(and(
        eq(dailyMatchups.matchupDate, yesterdayStr),
        eq(dailyMatchups.isScored, 0)
      ));

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

      entityAPoints = statsA[0]?.totalPoints || 0;
      entityBPoints = statsB[0]?.totalPoints || 0;
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

      entityAPoints = statsA[0]?.totalPoints || 0;
      entityBPoints = statsB[0]?.totalPoints || 0;
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

      entityAPoints = statsA[0]?.totalPoints || 0;
      entityBPoints = statsB[0]?.totalPoints || 0;
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

      entityAPoints = statsA[0]?.totalPoints || 0;
      entityBPoints = statsB[0]?.totalPoints || 0;
    }

    const winnerId = entityAPoints >= entityBPoints 
      ? matchup.entityAId 
      : matchup.entityBId;

    await db.update(dailyMatchups)
      .set({ 
        winnerId, 
        entityAPoints,
        entityBPoints,
        isScored: 1 
      })
      .where(eq(dailyMatchups.id, matchup.id));

    await updateUserPredictionsForMatchup(matchup.id, winnerId);

    console.log(`[PredictionService] Scored matchup ${matchup.id}: ${matchup.entityAName} (${entityAPoints}) vs ${matchup.entityBName} (${entityBPoints}) - Winner: ${winnerId}`);
  } catch (error) {
    console.error(`[PredictionService] Error scoring matchup ${matchup.id}:`, error);
  }
}

async function updateUserPredictionsForMatchup(matchupId: number, winnerId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const predictions = await db
      .select()
      .from(userPredictions)
      .where(eq(userPredictions.matchupId, matchupId));

    for (const prediction of predictions) {
      const isCorrect = prediction.predictedWinnerId === winnerId ? 1 : 0;

      await db.update(userPredictions)
        .set({ isCorrect })
        .where(eq(userPredictions.id, prediction.id));

      await updateUserStreak(prediction.userId, isCorrect === 1);
    }
  } catch (error) {
    console.error(`[PredictionService] Error updating predictions for matchup ${matchupId}:`, error);
  }
}

async function updateUserStreak(userId: number, wasCorrect: boolean): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) return;

    let newStreak = wasCorrect 
      ? (user.currentPredictionStreak || 0) + 1 
      : 0;
    
    let newLongest = Math.max(
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
