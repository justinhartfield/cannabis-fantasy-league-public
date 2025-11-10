/**
 * Scoring Engine
 * 
 * Calculates fantasy points for manufacturers, strains, and pharmacies
 * based on their weekly performance metrics.
 */

import { getDb } from './db';
import { 
  manufacturers, 
  strains, 
  cannabisStrains,
  pharmacies,
  manufacturerWeeklyStats,
  strainWeeklyStats,
  cannabisStrainWeeklyStats,
  pharmacyWeeklyStats,
  weeklyLineups,
  weeklyTeamScores,
  scoringBreakdowns,
  teams,
} from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { wsManager } from './websocket';

// ============================================================================
// SCORING FORMULAS
// ============================================================================

/**
 * Calculate manufacturer fantasy points
 */
export function calculateManufacturerPoints(stats: {
  salesVolumeGrams: number;
  growthRatePercent: number;
  marketShareRank: number;
  rankChange: number;
  productCount: number;
  previousWeekGrowth?: number;
}): { points: number; breakdown: any } {
  const breakdown: any = {
    components: [],
    subtotal: 0,
    bonuses: [],
    penalties: [],
    total: 0,
  };

  // 1. Sales Volume: 1 pt per 100g sold
  const salesPoints = Math.floor(stats.salesVolumeGrams / 100);
  breakdown.components.push({
    category: 'Sales Volume',
    value: stats.salesVolumeGrams,
    formula: `${stats.salesVolumeGrams}g ÷ 100`,
    points: salesPoints,
  });

  // 2. Growth Rate: 5 pts per 10% increase
  const growthPoints = Math.floor((stats.growthRatePercent / 10) * 5);
  breakdown.components.push({
    category: 'Growth Rate',
    value: stats.growthRatePercent,
    formula: `${stats.growthRatePercent}% ÷ 10 × 5`,
    points: growthPoints,
  });

  // 3. Market Share Gain: 10 pts per rank improvement
  const rankGainPoints = stats.rankChange > 0 ? stats.rankChange * 10 : 0;
  if (stats.rankChange > 0) {
    breakdown.components.push({
      category: 'Market Share Gain',
      value: stats.rankChange,
      formula: `${stats.rankChange} ranks × 10`,
      points: rankGainPoints,
    });
  }

  // 4. Top Rank Bonus: 25 pts for #1 position
  let topRankBonus = 0;
  if (stats.marketShareRank === 1) {
    topRankBonus = 25;
    breakdown.bonuses.push({
      type: 'Top Rank Bonus',
      condition: 'Rank #1',
      points: 25,
    });
  }

  // 5. Product Diversity: 2 pts per product
  const diversityPoints = stats.productCount * 2;
  breakdown.components.push({
    category: 'Product Diversity',
    value: stats.productCount,
    formula: `${stats.productCount} products × 2`,
    points: diversityPoints,
  });

  // 6. Consistency Bonus: 15 pts for 3+ weeks positive growth
  let consistencyBonus = 0;
  if (stats.previousWeekGrowth && stats.previousWeekGrowth > 0 && stats.growthRatePercent > 0) {
    // This would require tracking multiple weeks - simplified for now
    consistencyBonus = 15;
    breakdown.bonuses.push({
      type: 'Consistency Bonus',
      condition: '3+ weeks positive growth',
      points: 15,
    });
  }

  // Penalties
  // Manufacturer Decline: -20 pts if rank drops 5+ positions
  let declinePenalty = 0;
  if (stats.rankChange < -5) {
    declinePenalty = -20;
    breakdown.penalties.push({
      type: 'Manufacturer Decline',
      condition: `Rank dropped ${Math.abs(stats.rankChange)} positions`,
      points: -20,
    });
  }

  // Calculate totals
  breakdown.subtotal = salesPoints + growthPoints + rankGainPoints + diversityPoints;
  breakdown.total = breakdown.subtotal + topRankBonus + consistencyBonus + declinePenalty;

  return {
    points: breakdown.total,
    breakdown,
  };
}

/**
 * Calculate strain fantasy points
 */
export function calculateStrainPoints(stats: {
  favoriteCount: number;
  favoriteGrowth: number;
  pharmacyCount: number;
  pharmacyExpansion: number;
  avgPriceCents: number;
  priceStability: number;
  orderVolumeGrams: number;
  isTrending?: boolean;
  priceCategory?: string;
}): { points: number; breakdown: any } {
  const breakdown: any = {
    components: [],
    subtotal: 0,
    bonuses: [],
    penalties: [],
    total: 0,
  };

  // 1. Favorite Growth: 2 pts per new favorite
  const favoritePoints = stats.favoriteGrowth * 2;
  breakdown.components.push({
    category: 'Favorite Growth',
    value: stats.favoriteGrowth,
    formula: `${stats.favoriteGrowth} new favorites × 2`,
    points: favoritePoints,
  });

  // 2. Price Performance: ±5 pts based on stability
  let pricePoints = 0;
  if (stats.priceStability >= 90) {
    pricePoints = 5;
  } else if (stats.priceStability >= 70) {
    pricePoints = 3;
  } else if (stats.priceStability < 50) {
    pricePoints = -5;
  }
  breakdown.components.push({
    category: 'Price Performance',
    value: stats.priceStability,
    formula: `Stability ${stats.priceStability}%`,
    points: pricePoints,
  });

  // 3. Pharmacy Expansion: 10 pts per new pharmacy
  const expansionPoints = stats.pharmacyExpansion * 10;
  if (stats.pharmacyExpansion > 0) {
    breakdown.components.push({
      category: 'Pharmacy Expansion',
      value: stats.pharmacyExpansion,
      formula: `${stats.pharmacyExpansion} new pharmacies × 10`,
      points: expansionPoints,
    });
  }

  // 4. Order Volume: 1 pt per 50g sold
  const volumePoints = Math.floor(stats.orderVolumeGrams / 50);
  breakdown.components.push({
    category: 'Order Volume',
    value: stats.orderVolumeGrams,
    formula: `${stats.orderVolumeGrams}g ÷ 50`,
    points: volumePoints,
  });

  // 5. Trending Bonus: 15 pts for top 10 velocity
  let trendingBonus = 0;
  if (stats.isTrending) {
    trendingBonus = 15;
    breakdown.bonuses.push({
      type: 'Trending Bonus',
      condition: 'Top 10 favorite velocity',
      points: 15,
    });
  }

  // 6. Price Category: Up to 10 pts for premium tiers
  let priceCategoryPoints = 0;
  if (stats.priceCategory === 'expensive') {
    priceCategoryPoints = 10;
  } else if (stats.priceCategory === 'above_average') {
    priceCategoryPoints = 5;
  }
  if (priceCategoryPoints > 0) {
    breakdown.components.push({
      category: 'Price Category',
      value: stats.priceCategory,
      formula: `${stats.priceCategory} tier`,
      points: priceCategoryPoints,
    });
  }

  // Penalties
  // Price Crash: -15 pts if price drops >20%
  if (stats.priceStability < 30) {
    breakdown.penalties.push({
      type: 'Price Crash',
      condition: 'Price volatility >70%',
      points: -15,
    });
  }

  // Calculate totals
  breakdown.subtotal = favoritePoints + pricePoints + expansionPoints + volumePoints + priceCategoryPoints;
  breakdown.total = breakdown.subtotal + trendingBonus + (stats.priceStability < 30 ? -15 : 0);

  return {
    points: breakdown.total,
    breakdown,
  };
}

/**
 * Calculate cannabis strain fantasy points
 * Cannabis strains score based on aggregate metrics across all products using that strain
 */
export function calculateCannabisStrainPoints(stats: {
  totalFavorites: number; // Across all products
  pharmacyCount: number; // Pharmacies carrying this strain
  productCount: number; // Products using this strain
  avgPriceChange: number; // Price trend
  marketPenetration: number; // % of market
}): { points: number; breakdown: any } {
  const breakdown: any = {
    components: [],
    subtotal: 0,
    bonuses: [],
    penalties: [],
    total: 0,
  };

  // 1. Favorites: 1 pt per 100 favorites
  const favoritesPoints = Math.floor(stats.totalFavorites / 100);
  breakdown.components.push({
    category: 'Aggregate Favorites',
    value: stats.totalFavorites,
    formula: `${stats.totalFavorites} ÷ 100`,
    points: favoritesPoints,
  });

  // 2. Pharmacy Expansion: 5 pts per pharmacy carrying the strain
  const pharmacyPoints = stats.pharmacyCount * 5;
  breakdown.components.push({
    category: 'Pharmacy Expansion',
    value: stats.pharmacyCount,
    formula: `${stats.pharmacyCount} pharmacies × 5`,
    points: pharmacyPoints,
  });

  // 3. Product Count: 3 pts per product using the strain
  const productPoints = stats.productCount * 3;
  breakdown.components.push({
    category: 'Product Count',
    value: stats.productCount,
    formula: `${stats.productCount} products × 3`,
    points: productPoints,
  });

  // 4. Price Stability Bonus: 10 pts for ±5% price change
  let priceStabilityBonus = 0;
  if (Math.abs(stats.avgPriceChange) <= 5) {
    priceStabilityBonus = 10;
    breakdown.bonuses.push({
      type: 'Price Stability',
      condition: `±${Math.abs(stats.avgPriceChange)}% change`,
      points: 10,
    });
  }

  // 5. Market Penetration Bonus: 20 pts for >50% market penetration
  let marketPenetrationBonus = 0;
  if (stats.marketPenetration > 50) {
    marketPenetrationBonus = 20;
    breakdown.bonuses.push({
      type: 'High Market Penetration',
      condition: `${stats.marketPenetration}% of market`,
      points: 20,
    });
  }

  // Penalties
  // Price Volatility: -10 pts for >20% price change
  let volatilityPenalty = 0;
  if (Math.abs(stats.avgPriceChange) > 20) {
    volatilityPenalty = -10;
    breakdown.penalties.push({
      type: 'Price Volatility',
      condition: `${Math.abs(stats.avgPriceChange)}% change`,
      points: -10,
    });
  }

  // Calculate totals
  breakdown.subtotal = favoritesPoints + pharmacyPoints + productPoints;
  breakdown.total = breakdown.subtotal + priceStabilityBonus + marketPenetrationBonus + volatilityPenalty;

  return {
    points: breakdown.total,
    breakdown,
  };
}

/**
 * Calculate pharmacy fantasy points
 */
export function calculatePharmacyPoints(stats: {
  revenueCents: number;
  orderCount: number;
  avgOrderSizeGrams: number;
  customerRetentionRate: number;
  productVariety: number;
  appUsageRate: number;
  growthRatePercent: number;
  baselineRetention?: number;
}): { points: number; breakdown: any } {
  const breakdown: any = {
    components: [],
    subtotal: 0,
    bonuses: [],
    penalties: [],
    total: 0,
  };

  // 1. Weekly Revenue: 1 pt per €500
  const revenueEuros = stats.revenueCents / 100;
  const revenuePoints = Math.floor(revenueEuros / 500);
  breakdown.components.push({
    category: 'Weekly Revenue',
    value: revenueEuros,
    formula: `€${revenueEuros.toFixed(2)} ÷ 500`,
    points: revenuePoints,
  });

  // 2. Order Count: 2 pts per order
  const orderPoints = stats.orderCount * 2;
  breakdown.components.push({
    category: 'Order Count',
    value: stats.orderCount,
    formula: `${stats.orderCount} orders × 2`,
    points: orderPoints,
  });

  // 3. Customer Retention: 2 pts per % above baseline (75%)
  const baselineRetention = stats.baselineRetention || 75;
  const retentionBonus = Math.max(0, stats.customerRetentionRate - baselineRetention);
  const retentionPoints = retentionBonus * 2;
  if (retentionPoints > 0) {
    breakdown.components.push({
      category: 'Customer Retention',
      value: stats.customerRetentionRate,
      formula: `(${stats.customerRetentionRate}% - ${baselineRetention}%) × 2`,
      points: retentionPoints,
    });
  }

  // 4. Product Variety: 1 pt per 10 products
  const varietyPoints = Math.floor(stats.productVariety / 10);
  breakdown.components.push({
    category: 'Product Variety',
    value: stats.productVariety,
    formula: `${stats.productVariety} products ÷ 10`,
    points: varietyPoints,
  });

  // 5. Platform Usage: 5 pts if >60% app usage
  let platformBonus = 0;
  if (stats.appUsageRate > 60) {
    platformBonus = 5;
    breakdown.bonuses.push({
      type: 'Platform Usage',
      condition: `${stats.appUsageRate}% app usage (>60%)`,
      points: 5,
    });
  }

  // 6. Order Size: 1 pt per 10g average
  const orderSizePoints = Math.floor(stats.avgOrderSizeGrams / 10);
  breakdown.components.push({
    category: 'Order Size',
    value: stats.avgOrderSizeGrams,
    formula: `${stats.avgOrderSizeGrams}g ÷ 10`,
    points: orderSizePoints,
  });

  // 7. Growth Bonus: 3 pts per 5% increase
  const growthPoints = Math.floor((stats.growthRatePercent / 5) * 3);
  if (growthPoints > 0) {
    breakdown.components.push({
      category: 'Growth Bonus',
      value: stats.growthRatePercent,
      formula: `${stats.growthRatePercent}% ÷ 5 × 3`,
      points: growthPoints,
    });
  }

  // Penalties
  // Pharmacy Closure: -25 pts if closed
  // (This would be detected by missing data or zero orders)
  if (stats.orderCount === 0) {
    breakdown.penalties.push({
      type: 'Pharmacy Closure',
      condition: 'No orders this week',
      points: -25,
    });
  }

  // Calculate totals
  breakdown.subtotal = revenuePoints + orderPoints + retentionPoints + varietyPoints + orderSizePoints + growthPoints;
  breakdown.total = breakdown.subtotal + platformBonus + (stats.orderCount === 0 ? -25 : 0);

  return {
    points: breakdown.total,
    breakdown,
  };
}

// ============================================================================
// TEAM SCORING
// ============================================================================

/**
 * Calculate team bonuses based on total score and composition
 */
export function calculateTeamBonuses(
  totalPoints: number,
  positionPoints: {
    mfg1: number;
    mfg2: number;
    str1: number;
    str2: number;
    str3: number;
    str4: number;
    phm1: number;
    phm2: number;
    flex: number;
  }
): { bonuses: any[]; totalBonus: number } {
  const bonuses: any[] = [];
  let totalBonus = 0;

  // Perfect Week: +50 pts if all starters score >50 pts
  const allScores = Object.values(positionPoints);
  if (allScores.every(score => score > 50)) {
    bonuses.push({
      type: 'Perfect Week',
      condition: 'All starters >50 pts',
      points: 50,
    });
    totalBonus += 50;
  }

  // Underdog Victory: +25 pts if win with <600 total
  // (This would be determined in matchup context)

  // Market Domination: +30 pts if total >500
  if (totalPoints > 500) {
    bonuses.push({
      type: 'Market Domination',
      condition: 'Total score >500 pts',
      points: 30,
    });
    totalBonus += 30;
  }

  // Balanced Attack: +20 pts if all asset types contribute >25%
  const mfgTotal = positionPoints.mfg1 + positionPoints.mfg2;
  const strTotal = positionPoints.str1 + positionPoints.str2 + positionPoints.str3 + positionPoints.str4;
  const phmTotal = positionPoints.phm1 + positionPoints.phm2;
  
  const mfgPercent = (mfgTotal / totalPoints) * 100;
  const strPercent = (strTotal / totalPoints) * 100;
  const phmPercent = (phmTotal / totalPoints) * 100;

  if (mfgPercent > 25 && strPercent > 25 && phmPercent > 25) {
    bonuses.push({
      type: 'Balanced Attack',
      condition: 'All asset types >25% of total',
      points: 20,
    });
    totalBonus += 20;
  }

  return { bonuses, totalBonus };
}

// ============================================================================
// WEEKLY SCORING EXECUTION
// ============================================================================

/**
 * Calculate scores for all teams in a league for a specific week
 */
export async function calculateWeeklyScores(leagueId: number, year: number, week: number): Promise<void> {
  console.log(`[Scoring] Calculating scores for league ${leagueId}, ${year}-W${week}...`);

  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  try {
    // Get all teams in the league
    const leagueTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, leagueId));

    console.log(`[Scoring] Found ${leagueTeams.length} teams to score`);

    const teamScores: Array<{ teamId: number; teamName: string; points: number }> = [];

    for (const team of leagueTeams) {
      try {
        const points = await calculateTeamScore(team.id, year, week);
        teamScores.push({
          teamId: team.id,
          teamName: team.name,
          points,
        });
        
        // Broadcast individual team score update
        wsManager.broadcastToLeague(leagueId, {
          type: 'team_score_calculated',
          teamId: team.id,
          teamName: team.name,
          points,
          year,
          week,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`[Scoring] Error calculating score for team ${team.id}:`, error);
      }
    }

    // Broadcast final scores update with all teams
    wsManager.notifyScoresUpdated(leagueId, {
      week,
      year,
      scores: teamScores,
    });

    console.log(`[Scoring] Completed scoring for league ${leagueId}`);
    console.log(`[Scoring] Broadcasted scores to league ${leagueId} via WebSocket`);
  } catch (error) {
    console.error('[Scoring] Error calculating weekly scores:', error);
    throw error;
  }
}

/**
 * Calculate score for a single team for a specific week
 */
export async function calculateTeamScore(teamId: number, year: number, week: number): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Get the team's lineup for this week
  const lineup = await db
    .select()
    .from(weeklyLineups)
    .where(and(
      eq(weeklyLineups.teamId, teamId),
      eq(weeklyLineups.year, year),
      eq(weeklyLineups.week, week)
    ))
    .limit(1);

  if (lineup.length === 0) {
    console.log(`[Scoring] No lineup found for team ${teamId}, ${year}-W${week}`);
    return 0;
  }

  const teamLineup = lineup[0];

  // Calculate points for each position (9 total)
  const positionPoints = {
    mfg1: 0,
    mfg2: 0,
    cstr1: 0,
    cstr2: 0,
    prd1: 0,
    prd2: 0,
    phm1: 0,
    phm2: 0,
    flex: 0,
  };

  const breakdowns: any[] = [];

  // Score manufacturers
  if (teamLineup.mfg1Id) {
    const result = await scoreManufacturer(teamLineup.mfg1Id, year, week);
    positionPoints.mfg1 = result.points;
    breakdowns.push({ position: 'MFG1', assetType: 'manufacturer', assetId: teamLineup.mfg1Id, ...result });
  }

  if (teamLineup.mfg2Id) {
    const result = await scoreManufacturer(teamLineup.mfg2Id, year, week);
    positionPoints.mfg2 = result.points;
    breakdowns.push({ position: 'MFG2', assetType: 'manufacturer', assetId: teamLineup.mfg2Id, ...result });
  }

  // Score cannabis strains (genetics/cultivars)
  if (teamLineup.cstr1Id) {
    const result = await scoreCannabisStrain(teamLineup.cstr1Id, year, week);
    positionPoints.cstr1 = result.points;
    breakdowns.push({ position: 'CSTR1', assetType: 'cannabis_strain', assetId: teamLineup.cstr1Id, ...result });
  }

  if (teamLineup.cstr2Id) {
    const result = await scoreCannabisStrain(teamLineup.cstr2Id, year, week);
    positionPoints.cstr2 = result.points;
    breakdowns.push({ position: 'CSTR2', assetType: 'cannabis_strain', assetId: teamLineup.cstr2Id, ...result });
  }

  // Score products (pharmaceutical products)
  if (teamLineup.prd1Id) {
    const result = await scoreProduct(teamLineup.prd1Id, year, week);
    positionPoints.prd1 = result.points;
    breakdowns.push({ position: 'PRD1', assetType: 'product', assetId: teamLineup.prd1Id, ...result });
  }

  if (teamLineup.prd2Id) {
    const result = await scoreProduct(teamLineup.prd2Id, year, week);
    positionPoints.prd2 = result.points;
    breakdowns.push({ position: 'PRD2', assetType: 'product', assetId: teamLineup.prd2Id, ...result });
  }

  // Score pharmacies
  if (teamLineup.phm1Id) {
    const result = await scorePharmacy(teamLineup.phm1Id, year, week);
    positionPoints.phm1 = result.points;
    breakdowns.push({ position: 'PHM1', assetType: 'pharmacy', assetId: teamLineup.phm1Id, ...result });
  }

  if (teamLineup.phm2Id) {
    const result = await scorePharmacy(teamLineup.phm2Id, year, week);
    positionPoints.phm2 = result.points;
    breakdowns.push({ position: 'PHM2', assetType: 'pharmacy', assetId: teamLineup.phm2Id, ...result });
  }

  // Score FLEX
  if (teamLineup.flexId && teamLineup.flexType) {
    let result;
    if (teamLineup.flexType === 'manufacturer') {
      result = await scoreManufacturer(teamLineup.flexId, year, week);
    } else if (teamLineup.flexType === 'cannabis_strain') {
      result = await scoreCannabisStrain(teamLineup.flexId, year, week);
    } else if (teamLineup.flexType === 'product') {
      result = await scoreProduct(teamLineup.flexId, year, week);
    } else {
      result = await scorePharmacy(teamLineup.flexId, year, week);
    }
    positionPoints.flex = result.points;
    breakdowns.push({ position: 'FLEX', assetType: teamLineup.flexType, assetId: teamLineup.flexId, ...result });
  }

  // Calculate subtotal
  const subtotal = Object.values(positionPoints).reduce((sum, pts) => sum + pts, 0);

  // Calculate team bonuses
  const { bonuses, totalBonus } = calculateTeamBonuses(subtotal, positionPoints);

  // Calculate final total
  const totalPoints = subtotal + totalBonus;

  // Save to database
  await db.insert(weeklyTeamScores).values({
    teamId,
    year,
    week,
    mfg1Points: positionPoints.mfg1,
    mfg2Points: positionPoints.mfg2,
    cstr1Points: positionPoints.cstr1,
    cstr2Points: positionPoints.cstr2,
    prd1Points: positionPoints.prd1,
    prd2Points: positionPoints.prd2,
    phm1Points: positionPoints.phm1,
    phm2Points: positionPoints.phm2,
    flexPoints: positionPoints.flex,
    bonusPoints: totalBonus,
    penaltyPoints: 0, // Individual penalties are included in position scores
    totalPoints,
  });

  // Save scoring breakdowns
  const scoreId = (await db.select().from(weeklyTeamScores).where(and(
    eq(weeklyTeamScores.teamId, teamId),
    eq(weeklyTeamScores.year, year),
    eq(weeklyTeamScores.week, week)
  )).limit(1))[0].id;

  for (const breakdown of breakdowns) {
    await db.insert(scoringBreakdowns).values({
      weeklyTeamScoreId: scoreId,
      assetType: breakdown.assetType as any,
      assetId: breakdown.assetId,
      position: breakdown.position,
      breakdown: breakdown.breakdown,
      totalPoints: breakdown.points,
    });
  }

  console.log(`[Scoring] Team ${teamId} scored ${totalPoints} points for ${year}-W${week}`);

  return totalPoints;
}

/**
 * Score a manufacturer for a specific week
 */
async function scoreManufacturer(manufacturerId: number, year: number, week: number): Promise<{ points: number; breakdown: any }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Get weekly stats
  const stats = await db
    .select()
    .from(manufacturerWeeklyStats)
    .where(and(
      eq(manufacturerWeeklyStats.manufacturerId, manufacturerId),
      eq(manufacturerWeeklyStats.year, year),
      eq(manufacturerWeeklyStats.week, week)
    ))
    .limit(1);

  if (stats.length === 0) {
    console.log(`[Scoring] No stats found for manufacturer ${manufacturerId}, ${year}-W${week}`);
    return { points: 0, breakdown: {} };
  }

  const weekStats = stats[0];

  return calculateManufacturerPoints({
    salesVolumeGrams: weekStats.salesVolumeGrams,
    growthRatePercent: weekStats.growthRatePercent,
    marketShareRank: weekStats.marketShareRank,
    rankChange: weekStats.rankChange,
    productCount: weekStats.productCount,
  });
}

/**
 * Score a cannabis strain (genetics/cultivar) for a specific week
 * Cannabis strains score based on aggregate metrics across all products using that strain
 */
async function scoreCannabisStrain(cannabisStrainId: number, year: number, week: number): Promise<{ points: number; breakdown: any }> {
  const db = await getDb();  
  if (!db) {
    throw new Error('Database not available');
  }

  // Check if we have weekly stats for this cannabis strain
  const weeklyStats = await db
    .select()
    .from(cannabisStrainWeeklyStats)
    .where(
      and(
        eq(cannabisStrainWeeklyStats.cannabisStrainId, cannabisStrainId),
        eq(cannabisStrainWeeklyStats.year, year),
        eq(cannabisStrainWeeklyStats.week, week)
      )
    )
    .limit(1);

  if (weeklyStats.length === 0) {
    console.log(`[Scoring] No weekly stats found for cannabis strain ${cannabisStrainId}, ${year}-W${week}`);
    // Return zero points if no stats available
    return {
      points: 0,
      breakdown: {
        components: [{
          category: 'No Data',
          value: 0,
          formula: 'No weekly stats available',
          points: 0,
        }],
        subtotal: 0,
        bonuses: [],
        penalties: [],
        total: 0,
      },
    };
  }

  const stats = weeklyStats[0];
  
  // Calculate points using the cannabis strain scoring formula
  const result = calculateCannabisStrainPoints({
    totalFavorites: stats.totalFavorites,
    pharmacyCount: stats.pharmacyCount,
    productCount: stats.productCount,
    avgPriceChange: stats.priceChange,
    marketPenetration: stats.marketPenetration,
  });

  // Update the total points in the database
  await db
    .update(cannabisStrainWeeklyStats)
    .set({ totalPoints: result.points })
    .where(eq(cannabisStrainWeeklyStats.id, stats.id));

  return result;
}

/**
 * Score a product (pharmaceutical product) for a specific week
 */
async function scoreProduct(productId: number, year: number, week: number): Promise<{ points: number; breakdown: any }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Get weekly stats
  const stats = await db
    .select()
    .from(strainWeeklyStats)
    .where(and(
      eq(strainWeeklyStats.strainId, productId),
      eq(strainWeeklyStats.year, year),
      eq(strainWeeklyStats.week, week)
    ))
    .limit(1);

  if (stats.length === 0) {
    console.log(`[Scoring] No stats found for product ${productId}, ${year}-W${week}`);
    return { points: 0, breakdown: {} };
  }

  const weekStats = stats[0];

  return calculateStrainPoints({
    favoriteCount: weekStats.favoriteCount,
    favoriteGrowth: weekStats.favoriteGrowth,
    pharmacyCount: weekStats.pharmacyCount,
    pharmacyExpansion: weekStats.pharmacyExpansion,
    avgPriceCents: weekStats.avgPriceCents,
    priceStability: weekStats.priceStability,
    orderVolumeGrams: weekStats.orderVolumeGrams,
  });
}

/**
 * Score a pharmacy for a specific week
 */
async function scorePharmacy(pharmacyId: number, year: number, week: number): Promise<{ points: number; breakdown: any }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Get weekly stats
  const stats = await db
    .select()
    .from(pharmacyWeeklyStats)
    .where(and(
      eq(pharmacyWeeklyStats.pharmacyId, pharmacyId),
      eq(pharmacyWeeklyStats.year, year),
      eq(pharmacyWeeklyStats.week, week)
    ))
    .limit(1);

  if (stats.length === 0) {
    console.log(`[Scoring] No stats found for pharmacy ${pharmacyId}, ${year}-W${week}`);
    return { points: 0, breakdown: {} };
  }

  const weekStats = stats[0];

  return calculatePharmacyPoints({
    revenueCents: weekStats.revenueCents,
    orderCount: weekStats.orderCount,
    avgOrderSizeGrams: weekStats.avgOrderSizeGrams,
    customerRetentionRate: weekStats.customerRetentionRate,
    productVariety: weekStats.productVariety,
    appUsageRate: weekStats.appUsageRate,
    growthRatePercent: weekStats.growthRatePercent,
  });
}
