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
  brands,
  manufacturerWeeklyStats,
  strainWeeklyStats,
  cannabisStrainWeeklyStats,
  pharmacyWeeklyStats,
  brandWeeklyStats,
  weeklyLineups,
  weeklyTeamScores,
  scoringBreakdowns,
  teams,
  leagues,
  manufacturerDailyStats,
  strainDailyStats,
  cannabisStrainDailyStats,
  pharmacyDailyStats,
  brandDailyStats,
  dailyTeamScores,
  dailyScoringBreakdowns,
} from '../drizzle/schema';
import {
  manufacturerDailyChallengeStats,
  strainDailyChallengeStats,
  productDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats,
} from '../drizzle/dailyChallengeSchema';
import { eq, and } from 'drizzle-orm';
import { wsManager } from './websocket';
import { getOrCreateLineup } from './utils/autoLineup';
import { calculateBrandPoints } from './brandScoring';
import {
  calculateManufacturerScore as calculateDailyManufacturerScore,
  calculateStrainScore as calculateDailyStrainScore,
  calculatePharmacyScore as calculateDailyPharmacyScore,
  calculateBrandScore as calculateDailyBrandScore,
} from './dailyChallengeScoringEngine';

export type BreakdownComponent = {
  category: string;
  value: number | string;
  formula: string;
  points: number;
};

export type BreakdownBonus = {
  type: string;
  condition: string;
  points: number;
};

export type BreakdownDetail = {
  components: BreakdownComponent[];
  bonuses: BreakdownBonus[];
  penalties: BreakdownBonus[];
  subtotal: number;
  total: number;
};

export type BreakdownResult = {
  points: number;
  breakdown: BreakdownDetail;
};

const eurosFromCents = (cents: number): string => (cents / 100).toFixed(2);

function finalizeDailyBreakdown(
  components: BreakdownComponent[],
  bonuses: BreakdownBonus[],
  penalties: BreakdownBonus[] = [],
  storedTotal?: number | null,
  computedTotal?: number
): BreakdownResult {
  const targetTotal =
    typeof storedTotal === 'number'
      ? storedTotal
      : typeof computedTotal === 'number'
        ? computedTotal
        : 0;

  let subtotal = components.reduce((sum, component) => sum + component.points, 0);
  const bonusTotal = bonuses.reduce((sum, bonus) => sum + bonus.points, 0);
  const penaltyTotal = penalties.reduce((sum, penalty) => sum + penalty.points, 0);
  let total = subtotal + bonusTotal + penaltyTotal;

  if (total !== targetTotal) {
    const adjustment = targetTotal - total;
    components.push({
      category: 'Score Sync Adjustment',
      value: adjustment,
      formula: 'Align with stored score',
      points: adjustment,
    });
    subtotal += adjustment;
    total += adjustment;
  }

  return {
    points: targetTotal,
    breakdown: {
      components,
      bonuses,
      penalties,
      subtotal,
      total,
    },
  };
}

type ManufacturerDailyStat = typeof manufacturerDailyChallengeStats.$inferSelect;
type StrainDailyStat = typeof strainDailyChallengeStats.$inferSelect;
type ProductDailyStat = typeof productDailyChallengeStats.$inferSelect;
type PharmacyDailyStat = typeof pharmacyDailyChallengeStats.$inferSelect;
type BrandDailyStat = typeof brandDailyChallengeStats.$inferSelect;

type ManufacturerDailySource = Pick<ManufacturerDailyStat, 'salesVolumeGrams' | 'orderCount' | 'revenueCents' | 'rank' | 'totalPoints' | 'trendMultiplier' | 'previousRank' | 'consistencyScore' | 'velocityScore' | 'streakDays' | 'marketSharePercent'>;
type StrainDailySource = Pick<StrainDailyStat, 'salesVolumeGrams' | 'orderCount' | 'rank' | 'totalPoints' | 'trendMultiplier' | 'previousRank' | 'consistencyScore' | 'velocityScore' | 'streakDays' | 'marketSharePercent'>;
type PharmacyDailySource = Pick<PharmacyDailyStat, 'orderCount' | 'revenueCents' | 'rank' | 'totalPoints' | 'trendMultiplier' | 'previousRank' | 'consistencyScore' | 'velocityScore' | 'streakDays' | 'marketSharePercent'>;
type BrandDailySource = Pick<BrandDailyStat, 'totalRatings' | 'averageRating' | 'bayesianAverage' | 'veryGoodCount' | 'goodCount' | 'acceptableCount' | 'badCount' | 'veryBadCount' | 'rank' | 'totalPoints'>;

export function buildManufacturerDailyBreakdown(statRecord: ManufacturerDailySource): BreakdownResult {
  const salesVolumeGrams = statRecord.salesVolumeGrams ?? 0;
  const orderCount = statRecord.orderCount ?? 0;
  const revenueCents = statRecord.revenueCents ?? 0;
  const rank = statRecord.rank ?? 0;

  // Check if trend data is available - if so, use trend-based breakdown
  if ('trendMultiplier' in statRecord && statRecord.trendMultiplier !== null && statRecord.trendMultiplier !== undefined) {
    const { calculateManufacturerTrendScore } = require('./trendScoringEngine');
    const { buildManufacturerTrendBreakdown } = require('./trendScoringBreakdowns');
    
    // Calculate the trend score breakdown
    const scoring = calculateManufacturerTrendScore({
      orderCount,
      trendMultiplier: Number(statRecord.trendMultiplier ?? 1),
      rank,
      previousRank: statRecord.previousRank ?? rank,
      consistencyScore: Number(statRecord.consistencyScore ?? 0),
      velocityScore: Number(statRecord.velocityScore ?? 0),
      streakDays: Number(statRecord.streakDays ?? 0),
      marketSharePercent: Number(statRecord.marketSharePercent ?? 0),
    });
    
    // Build the formatted breakdown for display
    return buildManufacturerTrendBreakdown(
      scoring,
      orderCount,
      rank,
      statRecord.previousRank ?? rank,
      Number(statRecord.streakDays ?? 0)
    );
  }

  // Fallback to old breakdown for legacy data
  const scoreParts = calculateDailyManufacturerScore(
    {
      salesVolumeGrams,
      orderCount,
      revenueCents,
    },
    rank
  );

  const components: BreakdownComponent[] = [
    {
      category: 'Sales Volume',
      value: salesVolumeGrams,
      formula: `${salesVolumeGrams}g ÷ 10`,
      points: scoreParts.salesVolumePoints,
    },
    {
      category: 'Order Count',
      value: orderCount,
      formula: `${orderCount} orders × 5`,
      points: scoreParts.orderCountPoints,
    },
    {
      category: 'Revenue',
      value: `€${eurosFromCents(revenueCents)}`,
      formula: `€${eurosFromCents(revenueCents)} ÷ 10`,
      points: scoreParts.revenuePoints,
    },
  ];

  const bonuses: BreakdownBonus[] = [];
  if (scoreParts.rankBonusPoints) {
    bonuses.push({
      type: 'Top Seller Bonus',
      condition: rank === 1 ? 'Rank #1' : `Rank #${rank}`,
      points: scoreParts.rankBonusPoints,
    });
  }

  return finalizeDailyBreakdown(components, bonuses, [], statRecord.totalPoints, scoreParts.totalPoints);
}

export function buildStrainDailyBreakdown(statRecord: StrainDailySource): BreakdownResult {
  const salesVolumeGrams = statRecord.salesVolumeGrams ?? 0;
  const orderCount = statRecord.orderCount ?? 0;
  const rank = statRecord.rank ?? 0;

  // Check if trend data is available - if so, use trend-based breakdown
  if ('trendMultiplier' in statRecord && statRecord.trendMultiplier !== null && statRecord.trendMultiplier !== undefined) {
    const { calculateStrainTrendScore } = require('./trendScoringEngine');
    const { buildStrainTrendBreakdown } = require('./trendScoringBreakdowns');
    
    // Calculate the trend score breakdown
    const scoring = calculateStrainTrendScore({
      orderCount,
      trendMultiplier: Number(statRecord.trendMultiplier ?? 1),
      rank,
      previousRank: statRecord.previousRank ?? rank,
      consistencyScore: Number(statRecord.consistencyScore ?? 0),
      velocityScore: Number(statRecord.velocityScore ?? 0),
      streakDays: Number(statRecord.streakDays ?? 0),
      marketSharePercent: Number(statRecord.marketSharePercent ?? 0),
    });
    
    // Build the formatted breakdown for display
    return buildStrainTrendBreakdown(
      scoring,
      orderCount,
      rank,
      statRecord.previousRank ?? rank,
      Number(statRecord.streakDays ?? 0)
    );
  }

  // Fallback to old breakdown for legacy data
  const scoreParts = calculateDailyStrainScore(
    {
      salesVolumeGrams,
      orderCount,
    },
    rank
  );

  const components: BreakdownComponent[] = [
    {
      category: 'Sales Volume',
      value: salesVolumeGrams,
      formula: `${salesVolumeGrams}g ÷ 10`,
      points: scoreParts.salesVolumePoints,
    },
    {
      category: 'Order Count',
      value: orderCount,
      formula: `${orderCount} orders × 5`,
      points: scoreParts.orderCountPoints,
    },
  ];

  const bonuses: BreakdownBonus[] = [];
  if (scoreParts.rankBonusPoints) {
    bonuses.push({
      type: 'Popularity Bonus',
      condition: rank === 1 ? 'Rank #1' : `Rank #${rank}`,
      points: scoreParts.rankBonusPoints,
    });
  }

  return finalizeDailyBreakdown(components, bonuses, [], statRecord.totalPoints, scoreParts.totalPoints);
}

export function buildPharmacyDailyBreakdown(statRecord: PharmacyDailySource): BreakdownResult {
  const orderCount = statRecord.orderCount ?? 0;
  const revenueCents = statRecord.revenueCents ?? 0;
  const rank = statRecord.rank ?? 0;

  // Check if trend data is available - if so, use trend-based breakdown
  if ('trendMultiplier' in statRecord && statRecord.trendMultiplier !== null && statRecord.trendMultiplier !== undefined) {
    const { calculatePharmacyTrendScore } = require('./trendScoringEngine');
    const { buildPharmacyTrendBreakdown } = require('./trendScoringBreakdowns');
    
    // Calculate the trend score breakdown
    const scoring = calculatePharmacyTrendScore({
      orderCount,
      trendMultiplier: Number(statRecord.trendMultiplier ?? 1),
      rank,
      previousRank: statRecord.previousRank ?? rank,
      consistencyScore: Number(statRecord.consistencyScore ?? 0),
      velocityScore: Number(statRecord.velocityScore ?? 0),
      streakDays: Number(statRecord.streakDays ?? 0),
      marketSharePercent: Number(statRecord.marketSharePercent ?? 0),
    });
    
    // Build the formatted breakdown for display
    return buildPharmacyTrendBreakdown(
      scoring,
      orderCount,
      rank,
      statRecord.previousRank ?? rank,
      Number(statRecord.streakDays ?? 0)
    );
  }

  // Fallback to old breakdown for legacy data
  const scoreParts = calculateDailyPharmacyScore(
    {
      orderCount,
      revenueCents,
    },
    rank
  );

  const components: BreakdownComponent[] = [
    {
      category: 'Order Count',
      value: orderCount,
      formula: `${orderCount} orders × 10`,
      points: scoreParts.orderCountPoints,
    },
    {
      category: 'Revenue',
      value: `€${eurosFromCents(revenueCents)}`,
      formula: `€${eurosFromCents(revenueCents)} ÷ 10`,
      points: scoreParts.revenuePoints,
    },
  ];

  const bonuses: BreakdownBonus[] = [];
  if (scoreParts.rankBonusPoints) {
    bonuses.push({
      type: 'Top Pharmacy Bonus',
      condition: rank === 1 ? 'Rank #1' : `Rank #${rank}`,
      points: scoreParts.rankBonusPoints,
    });
  }

  return finalizeDailyBreakdown(components, bonuses, [], statRecord.totalPoints, scoreParts.totalPoints);
}

export function buildBrandDailyBreakdown(statRecord: BrandDailySource): BreakdownResult {
  const totalRatings = statRecord.totalRatings ?? 0;
  const averageRating = Number(statRecord.averageRating ?? 0);
  const bayesianAverage = Number(statRecord.bayesianAverage ?? 0);
  const rank = statRecord.rank ?? 0;

  const scoreParts = calculateDailyBrandScore(
    {
      totalRatings,
      averageRating,
      bayesianAverage,
      veryGoodCount: statRecord.veryGoodCount ?? 0,
      goodCount: statRecord.goodCount ?? 0,
      acceptableCount: statRecord.acceptableCount ?? 0,
      badCount: statRecord.badCount ?? 0,
      veryBadCount: statRecord.veryBadCount ?? 0,
    },
    rank
  );

  const components: BreakdownComponent[] = [
    {
      category: 'Rating Volume',
      value: totalRatings,
      formula: `${totalRatings} ratings × 10`,
      points: scoreParts.ratingCountPoints ?? 0,
    },
    {
      category: 'Rating Quality',
      value: bayesianAverage.toFixed(2),
      formula: `Bayesian avg ${bayesianAverage.toFixed(2)} × 20`,
      points: scoreParts.ratingQualityPoints ?? 0,
    },
  ];

  const bonuses: BreakdownBonus[] = [];
  if (scoreParts.rankBonusPoints) {
    bonuses.push({
      type: 'Top Brand Bonus',
      condition: rank === 1 ? 'Rank #1' : `Rank #${rank}`,
      points: scoreParts.rankBonusPoints,
    });
  }

  return finalizeDailyBreakdown(components, bonuses, [], statRecord.totalPoints, scoreParts.totalPoints);
}

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

type ScoreScope =
  | { type: 'weekly'; year: number; week: number }
  | { type: 'daily'; statDate: string };

type TeamScorePersistence =
  | { mode: 'weekly'; teamId: number; year: number; week: number }
  | { mode: 'daily'; teamId: number; challengeId: number; statDate: string };

function getIsoYearWeek(date: Date): { year: number; week: number } {
  const tempDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: tempDate.getUTCFullYear(), week };
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
    cstr1: number;
    cstr2: number;
    prd1: number;
    prd2: number;
    phm1: number;
    phm2: number;
    brd1: number;
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
  if (totalPoints > 0) {
    const mfgTotal = positionPoints.mfg1 + positionPoints.mfg2;
    const cultivarTotal = positionPoints.cstr1 + positionPoints.cstr2 + positionPoints.prd1 + positionPoints.prd2;
    const retailTotal = positionPoints.phm1 + positionPoints.phm2 + positionPoints.brd1;

    const mfgPercent = (mfgTotal / totalPoints) * 100;
    const cultivarPercent = (cultivarTotal / totalPoints) * 100;
    const retailPercent = (retailTotal / totalPoints) * 100;

    if (mfgPercent > 25 && cultivarPercent > 25 && retailPercent > 25) {
      bonuses.push({
        type: 'Balanced Attack',
        condition: 'Manufacturers, cultivars, and retail each >25%',
        points: 20,
      });
      totalBonus += 20;
    }
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
  return computeTeamScore({
    teamId,
    lineupYear: year,
    lineupWeek: week,
    scope: { type: 'weekly', year, week },
    persistence: { mode: 'weekly', teamId, year, week },
  });
}

/**
 * Calculate score for a single team for a specific challenge day
 */
export async function calculateTeamDailyScore(teamId: number, challengeId: number, statDate: string): Promise<number> {
  console.log(`[calculateTeamDailyScore] Starting calculation for team ${teamId}, challenge ${challengeId}, date ${statDate}`);
  const normalizedDate = new Date(`${statDate}T00:00:00Z`);
  if (Number.isNaN(normalizedDate.getTime())) {
    throw new Error(`Invalid stat date: ${statDate}`);
  }
  const { year, week } = getIsoYearWeek(normalizedDate);
  const dateString = normalizedDate.toISOString().split('T')[0];
  console.log(`[calculateTeamDailyScore] Using year=${year}, week=${week}, dateString=${dateString}`);

  const score = await computeTeamScore({
    teamId,
    lineupYear: year,
    lineupWeek: week,
    scope: { type: 'daily', statDate: dateString },
    persistence: { mode: 'daily', teamId, challengeId, statDate: dateString },
  });
  console.log(`[calculateTeamDailyScore] Calculated score for team ${teamId}: ${score} points`);
  return score;
}

/**
 * Calculate scores for a daily challenge on a specific date
 */
export async function calculateDailyChallengeScores(challengeId: number, statDate?: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const challenge = await db.select().from(leagues).where(eq(leagues.id, challengeId)).limit(1);
  if (challenge.length === 0) {
    throw new Error('Challenge not found');
  }

  const targetDate = statDate
    ? new Date(`${statDate}T00:00:00Z`)
    : new Date(challenge[0].createdAt);

  if (Number.isNaN(targetDate.getTime())) {
    throw new Error(`Invalid challenge stat date: ${statDate}`);
  }

  const statDateString = targetDate.toISOString().split('T')[0];

  // Automatically aggregate daily stats with trend-based scoring
  console.log(`[calculateDailyChallengeScores] Aggregating daily stats with trend scoring for ${statDateString}...`);
  const { dailyChallengeAggregatorV2 } = await import('./dailyChallengeAggregatorV2');
  try {
    await dailyChallengeAggregatorV2.aggregateForDate(statDateString);
    console.log(`[calculateDailyChallengeScores] Daily stats aggregated successfully with trend scoring for ${statDateString}`);
  } catch (error) {
    console.error(`[calculateDailyChallengeScores] Failed to aggregate daily stats:`, error);
    // Continue anyway - maybe stats already exist
  }

  const challengeTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, challengeId));

  console.log(`[calculateDailyChallengeScores] Found ${challengeTeams.length} teams in challenge ${challengeId}`);
  console.log(`[calculateDailyChallengeScores] Using stat date: ${statDateString}`);
  
  // Calculate scores for all teams in parallel for better performance
  await Promise.all(
    challengeTeams.map(async (team) => {
      try {
        console.log(`[calculateDailyChallengeScores] Processing team ${team.id} (${team.name})`);
        await calculateTeamDailyScore(team.id, challengeId, statDateString);
      } catch (error) {
        console.error(`[Scoring] Error calculating daily score for team ${team.id}:`, error);
      }
    })
  );

  const scores = await db
    .select({
      teamId: dailyTeamScores.teamId,
      teamName: teams.name,
      points: dailyTeamScores.totalPoints,
    })
    .from(dailyTeamScores)
    .innerJoin(teams, eq(teams.id, dailyTeamScores.teamId))
    .where(and(
      eq(dailyTeamScores.challengeId, challengeId),
      eq(dailyTeamScores.statDate, statDateString)
    ));

  const { year, week } = getIsoYearWeek(targetDate);

  wsManager.notifyChallengeScoreUpdate(challengeId, {
    challengeId,
    year,
    week,
    statDate: statDateString,
    scores,
    updateTime: new Date().toISOString(),
  });
}

interface TeamScoreComputationOptions {
  teamId: number;
  lineupYear: number;
  lineupWeek: number;
  scope: ScoreScope;
  persistence: TeamScorePersistence;
}

async function computeTeamScore(options: TeamScoreComputationOptions): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const teamLineup = await getOrCreateLineup(
    options.teamId,
    options.lineupYear,
    options.lineupWeek,
    options.persistence.mode === 'daily'
      ? { mode: 'daily', statDate: options.persistence.statDate }
      : { mode: 'weekly' }
  );

  if (!teamLineup) {
    console.log(`[Scoring] No lineup available for team ${options.teamId}, ctx=${options.lineupYear}-W${options.lineupWeek}`);
    return 0;
  }

  const positionPoints = {
    mfg1: 0,
    mfg2: 0,
    cstr1: 0,
    cstr2: 0,
    prd1: 0,
    prd2: 0,
    phm1: 0,
    phm2: 0,
    brd1: 0,
    flex: 0,
  };

  const breakdowns: any[] = [];

  const scope = options.scope;

  if (teamLineup.mfg1Id) {
    const result = await scoreManufacturer(teamLineup.mfg1Id, scope);
    positionPoints.mfg1 = result.points;
    breakdowns.push({ position: 'MFG1', assetType: 'manufacturer', assetId: teamLineup.mfg1Id, ...result });
  }

  if (teamLineup.mfg2Id) {
    const result = await scoreManufacturer(teamLineup.mfg2Id, scope);
    positionPoints.mfg2 = result.points;
    breakdowns.push({ position: 'MFG2', assetType: 'manufacturer', assetId: teamLineup.mfg2Id, ...result });
  }

  if (teamLineup.cstr1Id) {
    const result = await scoreCannabisStrain(teamLineup.cstr1Id, scope);
    positionPoints.cstr1 = result.points;
    breakdowns.push({ position: 'CSTR1', assetType: 'cannabis_strain', assetId: teamLineup.cstr1Id, ...result });
  }

  if (teamLineup.cstr2Id) {
    const result = await scoreCannabisStrain(teamLineup.cstr2Id, scope);
    positionPoints.cstr2 = result.points;
    breakdowns.push({ position: 'CSTR2', assetType: 'cannabis_strain', assetId: teamLineup.cstr2Id, ...result });
  }

  if (teamLineup.prd1Id) {
    const result = await scoreProduct(teamLineup.prd1Id, scope);
    positionPoints.prd1 = result.points;
    breakdowns.push({ position: 'PRD1', assetType: 'product', assetId: teamLineup.prd1Id, ...result });
  }

  if (teamLineup.prd2Id) {
    const result = await scoreProduct(teamLineup.prd2Id, scope);
    positionPoints.prd2 = result.points;
    breakdowns.push({ position: 'PRD2', assetType: 'product', assetId: teamLineup.prd2Id, ...result });
  }

  if (teamLineup.phm1Id) {
    const result = await scorePharmacy(teamLineup.phm1Id, scope);
    positionPoints.phm1 = result.points;
    breakdowns.push({ position: 'PHM1', assetType: 'pharmacy', assetId: teamLineup.phm1Id, ...result });
  }

  if (teamLineup.phm2Id) {
    const result = await scorePharmacy(teamLineup.phm2Id, scope);
    positionPoints.phm2 = result.points;
    breakdowns.push({ position: 'PHM2', assetType: 'pharmacy', assetId: teamLineup.phm2Id, ...result });
  }

  if (teamLineup.brd1Id) {
    const result = await scoreBrand(teamLineup.brd1Id, scope);
    positionPoints.brd1 = result.points;
    breakdowns.push({ position: 'BRD1', assetType: 'brand', assetId: teamLineup.brd1Id, ...result });
  }

  if (teamLineup.flexId && teamLineup.flexType) {
    let result;
    if (teamLineup.flexType === 'manufacturer') {
      result = await scoreManufacturer(teamLineup.flexId, scope);
    } else if (teamLineup.flexType === 'brand') {
      result = await scoreBrand(teamLineup.flexId, scope);
    } else if (teamLineup.flexType === 'cannabis_strain') {
      result = await scoreCannabisStrain(teamLineup.flexId, scope);
    } else if (teamLineup.flexType === 'product') {
      result = await scoreProduct(teamLineup.flexId, scope);
    } else {
      result = await scorePharmacy(teamLineup.flexId, scope);
    }
    positionPoints.flex = result.points;
    breakdowns.push({ position: 'FLEX', assetType: teamLineup.flexType, assetId: teamLineup.flexId, ...result });
  }

  const subtotal = Object.values(positionPoints).reduce((sum, pts) => sum + pts, 0);

  const { totalBonus } = calculateTeamBonuses(subtotal, positionPoints);

  const totalPoints = subtotal + totalBonus;

  await persistTeamScore(db, {
    persistence: options.persistence,
    positionPoints,
    totalPoints,
    totalBonus,
    breakdowns,
  });

  console.log(`[Scoring] Team ${options.teamId} scored ${totalPoints} points (${options.persistence.mode})`);

  return totalPoints;
}

interface PersistScoreParams {
  persistence: TeamScorePersistence;
  positionPoints: {
    mfg1: number;
    mfg2: number;
    cstr1: number;
    cstr2: number;
    prd1: number;
    prd2: number;
    phm1: number;
    phm2: number;
    brd1: number;
    flex: number;
  };
  totalPoints: number;
  totalBonus: number;
  breakdowns: Array<{
    position: string;
    assetType: string;
    assetId: number;
    points: number;
    breakdown: any;
  }>;
}

async function persistTeamScore(db: Awaited<ReturnType<typeof getDb>>, params: PersistScoreParams): Promise<void> {
  if (!db) {
    throw new Error('Database not available');
  }

  if (params.persistence.mode === 'weekly') {
    const existingScore = await db.select().from(weeklyTeamScores).where(and(
      eq(weeklyTeamScores.teamId, params.persistence.teamId),
      eq(weeklyTeamScores.year, params.persistence.year),
      eq(weeklyTeamScores.week, params.persistence.week)
    )).limit(1);

    let scoreId: number;

    if (existingScore.length > 0) {
      await db.update(weeklyTeamScores)
        .set({
          mfg1Points: params.positionPoints.mfg1,
          mfg2Points: params.positionPoints.mfg2,
          cstr1Points: params.positionPoints.cstr1,
          cstr2Points: params.positionPoints.cstr2,
          prd1Points: params.positionPoints.prd1,
          prd2Points: params.positionPoints.prd2,
          phm1Points: params.positionPoints.phm1,
          phm2Points: params.positionPoints.phm2,
          brd1Points: params.positionPoints.brd1,
          flexPoints: params.positionPoints.flex,
          bonusPoints: params.totalBonus,
          penaltyPoints: 0,
          totalPoints: params.totalPoints,
        })
        .where(and(
          eq(weeklyTeamScores.teamId, params.persistence.teamId),
          eq(weeklyTeamScores.year, params.persistence.year),
          eq(weeklyTeamScores.week, params.persistence.week)
        ));
      scoreId = existingScore[0].id;

      await db.delete(scoringBreakdowns)
        .where(eq(scoringBreakdowns.weeklyTeamScoreId, scoreId));
    } else {
      const inserted = await db.insert(weeklyTeamScores).values({
        teamId: params.persistence.teamId,
        year: params.persistence.year,
        week: params.persistence.week,
        mfg1Points: params.positionPoints.mfg1,
        mfg2Points: params.positionPoints.mfg2,
        cstr1Points: params.positionPoints.cstr1,
        cstr2Points: params.positionPoints.cstr2,
        prd1Points: params.positionPoints.prd1,
        prd2Points: params.positionPoints.prd2,
        phm1Points: params.positionPoints.phm1,
        phm2Points: params.positionPoints.phm2,
        brd1Points: params.positionPoints.brd1,
        flexPoints: params.positionPoints.flex,
        bonusPoints: params.totalBonus,
        penaltyPoints: 0,
        totalPoints: params.totalPoints,
      }).returning({ id: weeklyTeamScores.id });
      scoreId = inserted[0].id;
    }

    for (const breakdown of params.breakdowns) {
      await db.insert(scoringBreakdowns).values({
        weeklyTeamScoreId: scoreId,
        assetType: breakdown.assetType as any,
        assetId: breakdown.assetId,
        position: breakdown.position,
        breakdown: breakdown.breakdown,
        totalPoints: breakdown.points,
      });
    }
  } else {
    const existingScore = await db.select().from(dailyTeamScores).where(and(
      eq(dailyTeamScores.teamId, params.persistence.teamId),
      eq(dailyTeamScores.challengeId, params.persistence.challengeId),
      eq(dailyTeamScores.statDate, params.persistence.statDate)
    )).limit(1);

    let scoreId: number;

    if (existingScore.length > 0) {
      await db.update(dailyTeamScores)
        .set({
          mfg1Points: params.positionPoints.mfg1,
          mfg2Points: params.positionPoints.mfg2,
          cstr1Points: params.positionPoints.cstr1,
          cstr2Points: params.positionPoints.cstr2,
          prd1Points: params.positionPoints.prd1,
          prd2Points: params.positionPoints.prd2,
          phm1Points: params.positionPoints.phm1,
          phm2Points: params.positionPoints.phm2,
          brd1Points: params.positionPoints.brd1,
          flexPoints: params.positionPoints.flex,
          bonusPoints: params.totalBonus,
          penaltyPoints: 0,
          totalPoints: params.totalPoints,
          updatedAt: new Date().toISOString(),
        })
        .where(and(
          eq(dailyTeamScores.teamId, params.persistence.teamId),
          eq(dailyTeamScores.challengeId, params.persistence.challengeId),
          eq(dailyTeamScores.statDate, params.persistence.statDate)
        ));
      scoreId = existingScore[0].id;

      await db.delete(dailyScoringBreakdowns)
        .where(eq(dailyScoringBreakdowns.dailyTeamScoreId, scoreId));
    } else {
      const inserted = await db.insert(dailyTeamScores).values({
        teamId: params.persistence.teamId,
        challengeId: params.persistence.challengeId,
        statDate: params.persistence.statDate,
        mfg1Points: params.positionPoints.mfg1,
        mfg2Points: params.positionPoints.mfg2,
        cstr1Points: params.positionPoints.cstr1,
        cstr2Points: params.positionPoints.cstr2,
        prd1Points: params.positionPoints.prd1,
        prd2Points: params.positionPoints.prd2,
        phm1Points: params.positionPoints.phm1,
        phm2Points: params.positionPoints.phm2,
        brd1Points: params.positionPoints.brd1,
        flexPoints: params.positionPoints.flex,
        bonusPoints: params.totalBonus,
        penaltyPoints: 0,
        totalPoints: params.totalPoints,
      }).returning({ id: dailyTeamScores.id });
      scoreId = inserted[0].id;
    }

    for (const breakdown of params.breakdowns) {
      await db.insert(dailyScoringBreakdowns).values({
        dailyTeamScoreId: scoreId,
        assetType: breakdown.assetType as any,
        assetId: breakdown.assetId,
        position: breakdown.position,
        breakdown: breakdown.breakdown,
        totalPoints: breakdown.points,
      });
    }
  }
}

/**
 * Score a manufacturer for a specific week
 */
async function scoreManufacturer(manufacturerId: number, scope: ScoreScope): Promise<{ points: number; breakdown: any }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  let stats;
  if (scope.type === 'weekly') {
    stats = await db
      .select()
      .from(manufacturerWeeklyStats)
      .where(and(
        eq(manufacturerWeeklyStats.manufacturerId, manufacturerId),
        eq(manufacturerWeeklyStats.year, scope.year),
        eq(manufacturerWeeklyStats.week, scope.week)
      ))
      .limit(1);
  } else {
    // Daily challenge: use daily challenge stats with pre-calculated points
    stats = await db
      .select()
      .from(manufacturerDailyChallengeStats)
      .where(and(
        eq(manufacturerDailyChallengeStats.manufacturerId, manufacturerId),
        eq(manufacturerDailyChallengeStats.statDate, scope.statDate)
      ))
      .limit(1);
  }

  if (stats.length === 0) {
    console.log(`[Scoring] No stats found for manufacturer ${manufacturerId}, scope=${scope.type === 'weekly' ? `${scope.year}-W${scope.week}` : scope.statDate}`);
    return { points: 0, breakdown: {} };
  }

  const statRecord = stats[0];

  // For weekly scoring, calculate points using formula
  if (scope.type === 'weekly') {
    const weeklyStat = statRecord as typeof manufacturerWeeklyStats.$inferSelect;
    return calculateManufacturerPoints({
      salesVolumeGrams: weeklyStat.salesVolumeGrams,
      growthRatePercent: weeklyStat.growthRatePercent,
      marketShareRank: weeklyStat.marketShareRank,
      rankChange: weeklyStat.rankChange,
      productCount: weeklyStat.productCount,
    });
  }

  // For daily challenges, return raw metrics snapshot for trend-based scoring
  const dailyStat = statRecord as ManufacturerDailyStat;
  const points = dailyStat.totalPoints ?? 0;

  const breakdown = {
    salesVolumeGrams: dailyStat.salesVolumeGrams ?? 0,
    orderCount: dailyStat.orderCount ?? 0,
    revenueCents: dailyStat.revenueCents ?? 0,
    rank: dailyStat.rank ?? 0,
    previousRank: dailyStat.previousRank ?? 0,
    // Trend-based fields (may be zero for legacy rows)
    trendMultiplier: dailyStat.trendMultiplier !== null && dailyStat.trendMultiplier !== undefined
      ? Number(dailyStat.trendMultiplier)
      : undefined,
    consistencyScore: dailyStat.consistencyScore ?? 0,
    velocityScore: dailyStat.velocityScore ?? 0,
    streakDays: dailyStat.streakDays ?? 0,
    marketSharePercent: dailyStat.marketSharePercent !== null && dailyStat.marketSharePercent !== undefined
      ? Number(dailyStat.marketSharePercent)
      : 0,
  };

  return { points, breakdown };
}

/**
 * Score a cannabis strain (genetics/cultivar) for a specific week
 * Cannabis strains score based on aggregate metrics across all products using that strain
 */
async function scoreCannabisStrain(cannabisStrainId: number, scope: ScoreScope): Promise<{ points: number; breakdown: any }> {
  const db = await getDb();  
  if (!db) {
    throw new Error('Database not available');
  }

  let stats;
  if (scope.type === 'weekly') {
    stats = await db
      .select()
      .from(cannabisStrainWeeklyStats)
      .where(
        and(
          eq(cannabisStrainWeeklyStats.cannabisStrainId, cannabisStrainId),
          eq(cannabisStrainWeeklyStats.year, scope.year),
          eq(cannabisStrainWeeklyStats.week, scope.week)
        )
      )
      .limit(1);
  } else {
    // Daily challenge: use daily challenge stats with pre-calculated points
    stats = await db
      .select()
      .from(strainDailyChallengeStats)
      .where(
        and(
          eq(strainDailyChallengeStats.strainId, cannabisStrainId),
          eq(strainDailyChallengeStats.statDate, scope.statDate)
        )
      )
      .limit(1);
  }

  if (stats.length === 0) {
    console.log(`[Scoring] No stats found for cannabis strain ${cannabisStrainId}, scope=${scope.type === 'weekly' ? `${scope.year}-W${scope.week}` : scope.statDate}`);
    return {
      points: 0,
      breakdown: {
        components: [{
          category: 'No Data',
          value: 0,
          formula: 'No stats available',
          points: 0,
        }],
        subtotal: 0,
        bonuses: [],
        penalties: [],
        total: 0,
      },
    };
  }

  const statRecord = stats[0];
  
  // For weekly scoring, calculate points using formula
  if (scope.type === 'weekly') {
    const weeklyStat = statRecord as typeof cannabisStrainWeeklyStats.$inferSelect;
    const result = calculateCannabisStrainPoints({
      totalFavorites: weeklyStat.totalFavorites,
      pharmacyCount: weeklyStat.pharmacyCount,
      productCount: weeklyStat.productCount,
      avgPriceChange: weeklyStat.priceChange,
      marketPenetration: weeklyStat.marketPenetration,
    });

    await db
      .update(cannabisStrainWeeklyStats)
      .set({ totalPoints: result.points })
      .where(eq(cannabisStrainWeeklyStats.id, weeklyStat.id));

    return result;
  }

  // For daily challenges, return raw metrics snapshot for trend-based scoring
  const dailyStat = statRecord as StrainDailyStat;
  const points = dailyStat.totalPoints ?? 0;

  const breakdown = {
    salesVolumeGrams: dailyStat.salesVolumeGrams ?? 0,
    orderCount: dailyStat.orderCount ?? 0,
    rank: dailyStat.rank ?? 0,
    previousRank: dailyStat.previousRank ?? 0,
    trendMultiplier: dailyStat.trendMultiplier !== null && dailyStat.trendMultiplier !== undefined
      ? Number(dailyStat.trendMultiplier)
      : undefined,
    consistencyScore: dailyStat.consistencyScore ?? 0,
    velocityScore: dailyStat.velocityScore ?? 0,
    streakDays: dailyStat.streakDays ?? 0,
    marketSharePercent: dailyStat.marketSharePercent !== null && dailyStat.marketSharePercent !== undefined
      ? Number(dailyStat.marketSharePercent)
      : 0,
  };

  return { points, breakdown };
}

/**
 * Score a product (pharmaceutical product) for a specific week
 */
async function scoreProduct(productId: number, scope: ScoreScope): Promise<{ points: number; breakdown: any }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const stats = scope.type === 'weekly'
    ? await db
        .select()
        .from(strainWeeklyStats)
        .where(and(
          eq(strainWeeklyStats.strainId, productId),
          eq(strainWeeklyStats.year, scope.year),
          eq(strainWeeklyStats.week, scope.week)
        ))
        .limit(1)
    : await db
        .select()
        .from(productDailyChallengeStats)
        .where(and(
          eq(productDailyChallengeStats.productId, productId),
          eq(productDailyChallengeStats.statDate, scope.statDate)
        ))
        .limit(1);

  if (stats.length === 0) {
    console.log(`[Scoring] No stats found for product ${productId}, scope=${scope.type === 'weekly' ? `${scope.year}-W${scope.week}` : scope.statDate}`);
    return { points: 0, breakdown: {} };
  }

  const statRecord = stats[0];

  if (scope.type === 'weekly') {
    const weeklyStat = statRecord as typeof strainWeeklyStats.$inferSelect;
    return calculateStrainPoints({
      favoriteCount: weeklyStat.favoriteCount,
      favoriteGrowth: weeklyStat.favoriteGrowth,
      pharmacyCount: weeklyStat.pharmacyCount,
      pharmacyExpansion: weeklyStat.pharmacyExpansion,
      avgPriceCents: weeklyStat.avgPriceCents,
      priceStability: weeklyStat.priceStability,
      orderVolumeGrams: weeklyStat.orderVolumeGrams,
    });
  }

  const dailyStat = statRecord as ProductDailyStat;
  const points = dailyStat.totalPoints ?? 0;

  const breakdown = {
    salesVolumeGrams: dailyStat.salesVolumeGrams ?? 0,
    orderCount: dailyStat.orderCount ?? 0,
    rank: dailyStat.rank ?? 0,
    previousRank: dailyStat.previousRank ?? 0,
    trendMultiplier: dailyStat.trendMultiplier !== null && dailyStat.trendMultiplier !== undefined
      ? Number(dailyStat.trendMultiplier)
      : undefined,
    consistencyScore: dailyStat.consistencyScore ?? 0,
    velocityScore: dailyStat.velocityScore ?? 0,
    streakDays: dailyStat.streakDays ?? 0,
    marketSharePercent: dailyStat.marketSharePercent !== null && dailyStat.marketSharePercent !== undefined
      ? Number(dailyStat.marketSharePercent)
      : 0,
  };

  return { points, breakdown };
}

/**
 * Score a pharmacy for a specific week
 */
async function scorePharmacy(pharmacyId: number, scope: ScoreScope): Promise<{ points: number; breakdown: any }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const stats = scope.type === 'weekly'
    ? await db
        .select()
        .from(pharmacyWeeklyStats)
        .where(and(
          eq(pharmacyWeeklyStats.pharmacyId, pharmacyId),
          eq(pharmacyWeeklyStats.year, scope.year),
          eq(pharmacyWeeklyStats.week, scope.week)
        ))
        .limit(1)
    : await db
        .select()
        .from(pharmacyDailyChallengeStats)
        .where(and(
          eq(pharmacyDailyChallengeStats.pharmacyId, pharmacyId),
          eq(pharmacyDailyChallengeStats.statDate, scope.statDate)
        ))
        .limit(1);

  if (stats.length === 0) {
    console.log(`[Scoring] No stats found for pharmacy ${pharmacyId}, scope=${scope.type === 'weekly' ? `${scope.year}-W${scope.week}` : scope.statDate}`);
    return { points: 0, breakdown: {} };
  }

  const statRecord = stats[0];

  // For weekly scoring, calculate points using formula
  if (scope.type === 'weekly') {
    const weeklyStat = statRecord as typeof pharmacyWeeklyStats.$inferSelect;
    return calculatePharmacyPoints({
      revenueCents: weeklyStat.revenueCents,
      orderCount: weeklyStat.orderCount,
      avgOrderSizeGrams: weeklyStat.avgOrderSizeGrams,
      customerRetentionRate: weeklyStat.customerRetentionRate,
      productVariety: weeklyStat.productVariety,
      appUsageRate: weeklyStat.appUsageRate,
      growthRatePercent: weeklyStat.growthRatePercent,
    });
  }

  // For daily challenges, return raw metrics snapshot for trend-based scoring
  const dailyStat = statRecord as PharmacyDailyStat;
  const points = dailyStat.totalPoints ?? 0;

  const breakdown = {
    orderCount: dailyStat.orderCount ?? 0,
    revenueCents: dailyStat.revenueCents ?? 0,
    rank: dailyStat.rank ?? 0,
    previousRank: dailyStat.previousRank ?? 0,
    trendMultiplier: dailyStat.trendMultiplier !== null && dailyStat.trendMultiplier !== undefined
      ? Number(dailyStat.trendMultiplier)
      : undefined,
    consistencyScore: dailyStat.consistencyScore ?? 0,
    velocityScore: dailyStat.velocityScore ?? 0,
    streakDays: dailyStat.streakDays ?? 0,
    marketSharePercent: dailyStat.marketSharePercent !== null && dailyStat.marketSharePercent !== undefined
      ? Number(dailyStat.marketSharePercent)
      : 0,
  };

  return { points, breakdown };
}

/**
 * Score a brand for a specific week
 */
async function scoreBrand(brandId: number, scope: ScoreScope): Promise<{ points: number; breakdown: any }> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const stats = scope.type === 'weekly'
    ? await db
        .select()
        .from(brandWeeklyStats)
        .where(and(
          eq(brandWeeklyStats.brandId, brandId),
          eq(brandWeeklyStats.year, scope.year),
          eq(brandWeeklyStats.week, scope.week)
        ))
        .limit(1)
    : await db
        .select()
        .from(brandDailyChallengeStats)
        .where(and(
          eq(brandDailyChallengeStats.brandId, brandId),
          eq(brandDailyChallengeStats.statDate, scope.statDate)
        ))
        .limit(1);

  if (stats.length === 0) {
    console.log(`[Scoring] No stats found for brand ${brandId}, scope=${scope.type === 'weekly' ? `${scope.year}-W${scope.week}` : scope.statDate}`);
    return { points: 0, breakdown: {} };
  }

  const statRecord = stats[0];

  // For weekly scoring, calculate points using formula
  if (scope.type === 'weekly') {
    const weeklyStat = statRecord as typeof brandWeeklyStats.$inferSelect;
    return calculateBrandPoints({
      favorites: weeklyStat.favorites,
      favoriteGrowth: weeklyStat.favoriteGrowth,
      views: weeklyStat.views,
      viewGrowth: weeklyStat.viewGrowth,
      comments: weeklyStat.comments,
      commentGrowth: weeklyStat.commentGrowth,
      affiliateClicks: weeklyStat.affiliateClicks,
      clickGrowth: weeklyStat.clickGrowth,
      engagementRate: weeklyStat.engagementRate,
      sentimentScore: weeklyStat.sentimentScore,
    });
  }

  // For daily challenges, return detailed ratings-based breakdown
  const dailyStat = statRecord as BrandDailyStat;
  return buildBrandDailyBreakdown(dailyStat);
}
