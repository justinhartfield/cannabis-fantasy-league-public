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
import { eq, and, count, sql, sum, max, desc, gte, lte } from 'drizzle-orm';
import { wsManager } from './websocket';
import { getOrCreateLineup } from './utils/autoLineup';
import { calculateBrandPoints } from './brandScoring';
import {
  calculateManufacturerScore as calculateDailyManufacturerScore,
  calculateStrainScore as calculateDailyStrainScore,
  calculatePharmacyScore as calculateDailyPharmacyScore,
  calculateBrandScore as calculateDailyBrandScore,
} from './dailyChallengeScoringEngine';
import {
  calculateManufacturerTrendScore,
  calculateStrainTrendScore,
  calculatePharmacyTrendScore,
} from './trendScoringEngine';
import { getWeekDateRange } from './utils/isoWeek';

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

type AssetType = 'manufacturer' | 'cannabis_strain' | 'product' | 'pharmacy' | 'brand';

type ScarcityMultipliers = Record<AssetType, number>;

type ScoreMetadata = {
  scopeType: 'weekly' | 'daily';
  rankDelta?: number;
  currentRank?: number;
  previousRank?: number;
  marketSharePercent?: number;
  trendMultiplier?: number;
  streakDays?: number;
};

type AssetScoreResult = BreakdownResult & {
  metadata?: ScoreMetadata;
  scarcityMultiplier?: number;
};

type PositionPointsMap = {
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

type TeamBonusEntry = {
  type: string;
  condition: string;
  points: number;
};

type TeamScoreComputationResult = {
  totalPoints: number;
  positionPoints: PositionPointsMap;
  breakdowns: Array<{
    position: string;
    assetType: AssetType;
    assetId: number;
    breakdown: BreakdownDetail;
    points: number;
    metadata?: ScoreMetadata;
  }>;
  teamBonusTotal: number;
  teamBonuses: TeamBonusEntry[];
};

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  manufacturer: 'Manufacturer',
  cannabis_strain: 'Genetics',
  product: 'Product',
  pharmacy: 'Pharmacy',
  brand: 'Brand',
};

const SCARCITY_BASELINE = 100;
const MIN_SCARCITY = 0.65;
const MAX_SCARCITY = 1.35;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function computeScarcityMultiplier(totalAssets: number): number {
  const scarcityFactor = SCARCITY_BASELINE / Math.max(totalAssets, 10);
  const raw = Math.pow(scarcityFactor, 0.5);
  return clamp(Number(raw.toFixed(2)), MIN_SCARCITY, MAX_SCARCITY);
}

async function getScarcityMultipliers(db: Awaited<ReturnType<typeof getDb>>): Promise<ScarcityMultipliers> {
  if (!db) {
    return {
      manufacturer: 1,
      cannabis_strain: 1,
      product: 1,
      pharmacy: 1,
      brand: 1,
    };
  }

  const [
    [manufacturerResult],
    [strainResult],
    [cannabisStrainResult],
    [pharmacyResult],
    [brandResult],
  ] = await Promise.all([
    db.select({ count: count() }).from(manufacturers),
    db.select({ count: count() }).from(strains),
    db.select({ count: count() }).from(cannabisStrains),
    db.select({ count: count() }).from(pharmacies),
    db.select({ count: count() }).from(brands),
  ]);

  return {
    manufacturer: computeScarcityMultiplier(manufacturerResult?.count ?? 0),
    cannabis_strain: computeScarcityMultiplier(cannabisStrainResult?.count ?? 0),
    product: computeScarcityMultiplier(strainResult?.count ?? 0),
    pharmacy: computeScarcityMultiplier(pharmacyResult?.count ?? 0),
    brand: computeScarcityMultiplier(brandResult?.count ?? 0),
  };
}

function applyScarcityAdjustment(
  result: AssetScoreResult,
  assetType: AssetType,
  multiplier: number
): AssetScoreResult {
  const normalizedMultiplier = Number(multiplier?.toFixed(2)) || 1;
  if (!result?.breakdown || normalizedMultiplier === 1) {
    return {
      ...result,
      scarcityMultiplier: normalizedMultiplier,
    };
  }

  const adjustedPoints = Math.round(result.points * normalizedMultiplier);
  const delta = adjustedPoints - result.points;

  const detail = result.breakdown;
  detail.bonuses = detail.bonuses || [];
  detail.penalties = detail.penalties || [];

  if (delta !== 0) {
    const entry = {
      type: delta > 0 ? 'Scarcity Boost' : 'Scarcity Dampening',
      condition: `${ASSET_TYPE_LABELS[assetType]} depth ×${normalizedMultiplier.toFixed(2)}`,
      points: delta,
    };
    if (delta > 0) {
      detail.bonuses.push(entry);
    } else {
      detail.penalties.push(entry);
    }
  }

  detail.total = adjustedPoints;

  return {
    ...result,
    points: adjustedPoints,
    breakdown: detail,
    scarcityMultiplier: normalizedMultiplier,
  };
}

const computeMedian = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const computeStdDev = (values: number[]): number => {
  if (!values.length) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance =
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

type MetricDescriptor = {
  label: string;
  description: string;
};

const pickDescriptor = (
  value: number,
  tiers: Array<{ min: number; label: string; description: string }>
): MetricDescriptor => {
  const tier = tiers.find((entry) => value >= entry.min);
  return tier || tiers[tiers.length - 1];
};

const describeSupplyVolume = (grams: number): MetricDescriptor =>
  pickDescriptor(grams, [
    { min: 8000, label: 'Powerhouse Supply', description: 'Top-tier output vs. league leaders' },
    { min: 4000, label: 'High Activity', description: 'Comfortably above the league baseline' },
    { min: 1500, label: 'Steady Contributor', description: 'Around the league median supply' },
    { min: 0, label: 'Emerging Output', description: 'Building presence in the market' },
  ]);

const describeOrderVolume = (grams: number): MetricDescriptor =>
  pickDescriptor(grams, [
    { min: 3000, label: 'Surging Demand', description: 'Orders well above market average' },
    { min: 1500, label: 'Strong Demand', description: 'Healthy order velocity' },
    { min: 600, label: 'Consistent Demand', description: 'Near market baseline' },
    { min: 0, label: 'Selective Demand', description: 'Targeted or niche order flow' },
  ]);

const describeAverageOrderSize = (grams: number): MetricDescriptor =>
  pickDescriptor(grams, [
    { min: 55, label: 'Large Format Dispenses', description: 'Serving high-quantity prescriptions' },
    { min: 30, label: 'Balanced Prescription Size', description: 'Standard medical fulfilment' },
    { min: 0, label: 'Micro Fulfilment', description: 'Smaller, specialized orders' },
  ]);

const describeOrderCadence = (orders: number): MetricDescriptor =>
  pickDescriptor(orders, [
    { min: 120, label: 'High Throughput', description: 'Significantly above daily cadence' },
    { min: 60, label: 'Busy Day', description: 'Above the market baseline' },
    { min: 25, label: 'Steady Flow', description: 'Around the league median' },
    { min: 0, label: 'Targeted Fulfilment', description: 'Focused or low-volume day' },
  ]);

const buildDescriptorBreakdown = (
  primaryCategory: string,
  descriptor: MetricDescriptor,
  points: number,
  info: Array<{ category: string; value: number | string; description: string }> = []
): BreakdownDetail => {
  const components: BreakdownComponent[] = [
    {
      category: primaryCategory,
      value: descriptor.label,
      formula: descriptor.description,
      points,
    },
  ];

  info.forEach((item) => {
    components.push({
      category: item.category,
      value: item.value,
      formula: item.description,
      points: 0,
    });
  });

  return {
    components,
    bonuses: [],
    penalties: [],
    subtotal: points,
    total: points,
  };
};

const eurosFromCents = (cents: number): string => (cents / 100).toFixed(2);

function finalizeDailyBreakdown(
  components: BreakdownComponent[],
  bonuses: BreakdownBonus[],
  penalties: BreakdownBonus[] = []
): BreakdownResult {
  const subtotal = components.reduce((sum, component) => sum + component.points, 0);
  const bonusTotal = bonuses.reduce((sum, bonus) => sum + bonus.points, 0);
  const penaltyTotal = penalties.reduce((sum, penalty) => sum + penalty.points, 0);
  const total = subtotal + bonusTotal + penaltyTotal;

  return {
    points: total,
    breakdown: {
      components,
      bonuses,
      penalties,
      subtotal,
      total,
    },
  };
}

const createEmptyBreakdown = (message?: string): BreakdownDetail => ({
  components: message
    ? [
      {
        category: message,
        value: '-',
        formula: 'No stats available',
        points: 0,
      },
    ]
    : [],
  bonuses: [],
  penalties: [],
  subtotal: 0,
  total: 0,
});

type ManufacturerDailyStat = typeof manufacturerDailyChallengeStats.$inferSelect;
type StrainDailyStat = typeof strainDailyChallengeStats.$inferSelect;
type ProductDailyStat = typeof productDailyChallengeStats.$inferSelect;
type PharmacyDailyStat = typeof pharmacyDailyChallengeStats.$inferSelect;
type BrandDailyStat = typeof brandDailyChallengeStats.$inferSelect;

type ManufacturerDailySource = Pick<ManufacturerDailyStat, 'salesVolumeGrams' | 'orderCount' | 'revenueCents' | 'rank' | 'totalPoints' | 'trendMultiplier' | 'previousRank' | 'consistencyScore' | 'velocityScore' | 'streakDays' | 'marketSharePercent'>;
type StrainDailySource = Pick<StrainDailyStat, 'salesVolumeGrams' | 'orderCount' | 'rank' | 'totalPoints' | 'trendMultiplier' | 'previousRank' | 'consistencyScore' | 'velocityScore' | 'streakDays' | 'marketSharePercent'>;
type ProductDailySource = Pick<ProductDailyStat, 'salesVolumeGrams' | 'orderCount' | 'rank' | 'totalPoints' | 'trendMultiplier' | 'previousRank' | 'consistencyScore' | 'velocityScore' | 'streakDays' | 'marketSharePercent'>;
type PharmacyDailySource = Pick<PharmacyDailyStat, 'orderCount' | 'revenueCents' | 'rank' | 'totalPoints' | 'trendMultiplier' | 'previousRank' | 'consistencyScore' | 'velocityScore' | 'streakDays' | 'marketSharePercent'>;
type BrandDailySource = Pick<BrandDailyStat, 'totalRatings' | 'averageRating' | 'bayesianAverage' | 'veryGoodCount' | 'goodCount' | 'acceptableCount' | 'badCount' | 'veryBadCount' | 'rank' | 'totalPoints'>;

export function buildManufacturerDailyBreakdown(statRecord: ManufacturerDailySource): BreakdownResult {
  const orderCount = statRecord.orderCount ?? 0;
  const rank = statRecord.rank ?? 0;

  // Use trend-based scoring exclusively
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

export function buildStrainDailyBreakdown(statRecord: StrainDailySource): BreakdownResult {
  const orderCount = statRecord.orderCount ?? 0;
  const rank = statRecord.rank ?? 0;

  // Use trend-based scoring exclusively
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

export function buildProductDailyBreakdown(statRecord: ProductDailySource): BreakdownResult {
  const orderCount = statRecord.orderCount ?? 0;
  const rank = statRecord.rank ?? 0;

  const { calculateProductTrendScore } = require('./trendScoringEngine');
  const { buildProductTrendBreakdown } = require('./trendScoringBreakdowns');

  const scoring = calculateProductTrendScore({
    orderCount,
    trendMultiplier: Number(statRecord.trendMultiplier ?? 1),
    rank,
    previousRank: statRecord.previousRank ?? rank,
    consistencyScore: Number(statRecord.consistencyScore ?? 0),
    velocityScore: Number(statRecord.velocityScore ?? 0),
    streakDays: Number(statRecord.streakDays ?? 0),
    marketSharePercent: Number(statRecord.marketSharePercent ?? 0),
  });

  return buildProductTrendBreakdown(
    scoring,
    orderCount,
    rank,
    statRecord.previousRank ?? rank,
    Number(statRecord.streakDays ?? 0)
  );
}

export function calculatePharmacyPoints(
  dailyStats: PharmacyDailySource[],
  weeklyContext: {
    rankChange: number;
    streakDays: number;
    marketSharePercent: number;
  }
): { points: number; breakdown: any } {
  let dailyTotal = 0;
  const dailyBreakdowns: any[] = [];

  for (const dayStat of dailyStats) {
    const dayScore = calculatePharmacyTrendScore({
      orderCount: dayStat.orderCount ?? 0,
      trendMultiplier: Number(dayStat.trendMultiplier ?? 1),
      currentRank: dayStat.rank ?? 0,
      previousRank: dayStat.previousRank ?? (dayStat.rank ?? 0),
      consistencyScore: Number(dayStat.consistencyScore ?? 0),
      velocityScore: Number(dayStat.velocityScore ?? 0),
      streakDays: Number(dayStat.streakDays ?? 0),
      marketSharePercent: Number(dayStat.marketSharePercent ?? 0),
    });
    dailyTotal += dayScore.totalPoints;
    dailyBreakdowns.push({ points: dayScore.totalPoints });
  }

  const breakdown: any = {
    components: [],
    bonuses: [],
    penalties: [],
    subtotal: dailyTotal,
    total: dailyTotal,
    // Metadata
    trendMultiplier: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].trendMultiplier ?? 1) : 1,
    streakDays: weeklyContext.streakDays,
    marketSharePercent: weeklyContext.marketSharePercent,
  };

  breakdown.components.push({
    category: 'Daily Performance',
    value: `${dailyStats.length} Days`,
    formula: 'Sum of daily challenge scores',
    points: dailyTotal,
  });

  // Season Bonuses
  if (weeklyContext.streakDays >= 21) {
    const consistencyBonus = 25;
    breakdown.bonuses.push({
      type: 'Consistency Streak',
      condition: '21+ Days Streak',
      points: consistencyBonus,
    });
    breakdown.total += consistencyBonus;
  }

  if (weeklyContext.rankChange > 0) {
    const rankBonus = Math.min(40, weeklyContext.rankChange * 10);
    breakdown.bonuses.push({
      type: 'Rank Climber',
      condition: `Gained ${weeklyContext.rankChange} spots`,
      points: rankBonus,
    });
    breakdown.total += rankBonus;
  }

  return { points: breakdown.total, breakdown };
}

export function buildBrandDailyBreakdown(statRecord: BrandDailySource): BreakdownResult {
  const totalRatings = statRecord.totalRatings ?? 0;
  const averageRating = Number(statRecord.averageRating ?? 0);
  const bayesianAverage = Number(statRecord.bayesianAverage ?? 0);
  const rank = statRecord.rank ?? 0;
  const storedPoints = statRecord.totalPoints ?? 0;
  const ratingDelta = statRecord.ratingDelta ?? 0;
  const bayesianDelta = Number(statRecord.bayesianDelta ?? 0);

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
      ratingDelta,
      bayesianDelta,
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

  if ((scoreParts.ratingDeltaPoints ?? 0) > 0) {
    components.push({
      category: 'New Ratings Momentum',
      value: ratingDelta,
      formula: `${ratingDelta} new ratings × 75`,
      points: scoreParts.ratingDeltaPoints ?? 0,
    });
  }

  if ((scoreParts.ratingTrendPoints ?? 0) > 0) {
    components.push({
      category: 'Rating Trend',
      value: bayesianDelta.toFixed(2),
      formula: `Positive avg change ${bayesianDelta.toFixed(2)} × 100`,
      points: scoreParts.ratingTrendPoints ?? 0,
    });
  }

  const bonuses: BreakdownBonus[] = [];
  if (scoreParts.rankBonusPoints) {
    bonuses.push({
      type: 'Top Brand Bonus',
      condition: rank === 1 ? 'Rank #1' : `Rank #${rank}`,
      points: scoreParts.rankBonusPoints,
    });
  }

  return finalizeDailyBreakdown(components, bonuses, []);
}

export function buildPharmacyDailyBreakdown(statRecord: PharmacyDailySource): BreakdownResult {
  const orderCount = statRecord.orderCount ?? 0;
  const rank = statRecord.rank ?? 0;

  // Use trend-based scoring exclusively
  const scoring = calculatePharmacyTrendScore({
    orderCount,
    trendMultiplier: Number(statRecord.trendMultiplier ?? 1),
    currentRank: rank,
    previousRank: statRecord.previousRank ?? rank,
    consistencyScore: Number(statRecord.consistencyScore ?? 0),
    velocityScore: Number(statRecord.velocityScore ?? 0),
    streakDays: Number(statRecord.streakDays ?? 0),
    marketSharePercent: Number(statRecord.marketSharePercent ?? 0),
  });

  // Build the formatted breakdown for display
  const breakdown: any = {
    components: [],
    bonuses: [],
    penalties: [],
    subtotal: scoring.totalPoints,
    total: scoring.totalPoints,
  };

  breakdown.components.push({
    category: 'Order Volume',
    value: orderCount,
    formula: `${orderCount} orders × 5`,
    points: scoring.basePoints,
  });

  if (scoring.trendBonus > 0) {
    breakdown.bonuses.push({
      type: 'Trend Bonus',
      condition: `${Number(statRecord.trendMultiplier ?? 1).toFixed(2)}x multiplier`,
      points: scoring.trendBonus,
    });
  }

  return {
    points: breakdown.total,
    breakdown,
  };
}

// ============================================================================
// SCORING FORMULAS
// ============================================================================

/**
 * Calculate manufacturer fantasy points
 */
/**
 * Calculate manufacturer fantasy points
 * REFACTORED: Unified Scoring System (Transparent Formulas + Trend/Flair)
 */
export function calculateManufacturerPoints(
  dailyStats: ManufacturerDailySource[],
  weeklyContext: {
    rankChange: number;
    marketShareRank: number;
    marketSharePercent: number;
    streakDays: number;
  }
): { points: number; breakdown: any } {
  let dailyTotal = 0;
  const dailyBreakdowns: any[] = [];

  // 1. Aggregate Daily Scores
  for (const dayStat of dailyStats) {
    const dayScore = calculateManufacturerTrendScore({
      orderCount: dayStat.orderCount ?? 0,
      trendMultiplier: Number(dayStat.trendMultiplier ?? 1),
      currentRank: dayStat.rank ?? 0,
      previousRank: dayStat.previousRank ?? (dayStat.rank ?? 0),
      consistencyScore: Number(dayStat.consistencyScore ?? 0),
      velocityScore: Number(dayStat.velocityScore ?? 0),
      streakDays: Number(dayStat.streakDays ?? 0),
      marketSharePercent: Number(dayStat.marketSharePercent ?? 0),
    });
    dailyTotal += dayScore.totalPoints;
    dailyBreakdowns.push({ points: dayScore.totalPoints });
  }

  const breakdown: any = {
    components: [],
    bonuses: [],
    penalties: [],
    subtotal: dailyTotal,
    total: dailyTotal,
    // Metadata for frontend
    streakDays: weeklyContext.streakDays,
    marketSharePercent: weeklyContext.marketSharePercent,
    trendMultiplier: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].trendMultiplier ?? 1) : 1,
  };

  // Add Daily Performance Component
  breakdown.components.push({
    category: 'Daily Performance',
    value: `${dailyStats.length} Days`,
    formula: 'Sum of daily challenge scores',
    points: dailyTotal,
  });

  // 2. Season Bonuses (The "Flair")

  // Consistency Streak: Bonus for 3+ weeks of growth (simulated by streakDays)
  if (weeklyContext.streakDays >= 21) {
    const consistencyBonus = 25;
    breakdown.bonuses.push({
      type: 'Consistency Streak',
      condition: '21+ Days Streak',
      points: consistencyBonus,
    });
    breakdown.total += consistencyBonus;
  }

  // Market Dominance Badge
  if (weeklyContext.marketShareRank === 1) {
    const dominanceBonus = 50;
    breakdown.bonuses.push({
      type: 'Market Dominance',
      condition: 'Rank #1 Market Share',
      points: dominanceBonus,
    });
    breakdown.total += dominanceBonus;
  } else if (weeklyContext.marketShareRank <= 3) {
    const topTierBonus = 25;
    breakdown.bonuses.push({
      type: 'Top Tier',
      condition: 'Top 3 Market Share',
      points: topTierBonus,
    });
    breakdown.total += topTierBonus;
  }

  // Rank Climber
  if (weeklyContext.rankChange > 0) {
    const rankBonus = Math.min(40, weeklyContext.rankChange * 10);
    breakdown.bonuses.push({
      type: 'Rank Climber',
      condition: `Gained ${weeklyContext.rankChange} spots`,
      points: rankBonus,
    });
    breakdown.total += rankBonus;
  }

  // Rank Slide Penalty
  if (weeklyContext.rankChange < -3) {
    const penalty = -15;
    breakdown.penalties.push({
      type: 'Rank Slide',
      condition: `Lost ${Math.abs(weeklyContext.rankChange)} spots`,
      points: penalty,
    });
    breakdown.total += penalty;
  }

  return { points: breakdown.total, breakdown };
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
/**
 * Calculate strain (Product) fantasy points
 * REFACTORED: Unified Scoring System
 */
export function calculateStrainPoints(
  dailyStats: StrainDailySource[],
  weeklyContext: {
    isTrending: boolean;
    streakDays: number;
    marketSharePercent: number;
  }
): { points: number; breakdown: any } {
  let dailyTotal = 0;
  const dailyBreakdowns: any[] = [];

  for (const dayStat of dailyStats) {
    const dayScore = calculateStrainTrendScore({
      orderCount: dayStat.orderCount ?? 0,
      trendMultiplier: Number(dayStat.trendMultiplier ?? 1),
      currentRank: dayStat.rank ?? 0,
      previousRank: dayStat.previousRank ?? (dayStat.rank ?? 0),
      consistencyScore: Number(dayStat.consistencyScore ?? 0),
      velocityScore: Number(dayStat.velocityScore ?? 0),
      streakDays: Number(dayStat.streakDays ?? 0),
      marketSharePercent: Number(dayStat.marketSharePercent ?? 0),
    });
    dailyTotal += dayScore.totalPoints;
    dailyBreakdowns.push({ points: dayScore.totalPoints });
  }

  const breakdown: any = {
    components: [],
    bonuses: [],
    penalties: [],
    subtotal: dailyTotal,
    total: dailyTotal,
    // Metadata
    trendMultiplier: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].trendMultiplier ?? 1) : 1,
    isTrending: weeklyContext.isTrending,
    streakDays: weeklyContext.streakDays,
  };

  breakdown.components.push({
    category: 'Daily Performance',
    value: `${dailyStats.length} Days`,
    formula: 'Sum of daily challenge scores',
    points: dailyTotal,
  });

  // Season Bonuses
  if (weeklyContext.isTrending) {
    const trendingBonus = 20;
    breakdown.bonuses.push({
      type: 'Trending Status',
      condition: 'High velocity item',
      points: trendingBonus,
    });
    breakdown.total += trendingBonus;
  }

  if (weeklyContext.streakDays >= 14) {
    const streakBonus = 15;
    breakdown.bonuses.push({
      type: 'Hot Streak',
      condition: '14+ Days Top 10',
      points: streakBonus,
    });
    breakdown.total += streakBonus;
  }

  return { points: breakdown.total, breakdown };
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

  // 1. Favorites: 1 pt per 150 favorites
  const favoritesPoints = Math.floor(stats.totalFavorites / 150);
  breakdown.components.push({
    category: 'Aggregate Favorites',
    value: stats.totalFavorites,
    formula: `${stats.totalFavorites} ÷ 150`,
    points: favoritesPoints,
  });

  // 2. Pharmacy Expansion: 4 pts per pharmacy carrying the strain
  const pharmacyPoints = stats.pharmacyCount * 4;
  breakdown.components.push({
    category: 'Pharmacy Expansion',
    value: stats.pharmacyCount,
    formula: `${stats.pharmacyCount} pharmacies × 4`,
    points: pharmacyPoints,
  });

  // 3. Product Count: 2 pts per product using the strain
  const productPoints = stats.productCount * 2;
  breakdown.components.push({
    category: 'Product Count',
    value: stats.productCount,
    formula: `${stats.productCount} products × 2`,
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

  // 5. Market Penetration Bonus: 15 pts for >50% market penetration
  let marketPenetrationBonus = 0;
  if (stats.marketPenetration > 50) {
    marketPenetrationBonus = 15;
    breakdown.bonuses.push({
      type: 'High Market Penetration',
      condition: `${stats.marketPenetration}% of market`,
      points: 15,
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


// ============================================================================
// TEAM SCORING
// ============================================================================

/**
 * Calculate team bonuses based on total score and composition
 */
export function calculateTeamBonuses(
  totalPoints: number,
  positionPoints: PositionPointsMap,
  assetBreakdowns: Array<{
    position: string;
    assetType: AssetType;
    metadata?: ScoreMetadata;
  }>,
  scope: ScoreScope
): { bonuses: TeamBonusEntry[]; totalBonus: number } {
  const appliedBonuses: TeamBonusEntry[] = [];
  const baseBonuses: TeamBonusEntry[] = [];
  let remainingCap = 100;

  const allScores = Object.values(positionPoints);
  const median = computeMedian(allScores);
  if (allScores.every(score => score > 0 && score >= median)) {
    baseBonuses.push({
      type: 'Perfect Week',
      condition: 'All starters beat team median',
      points: 50,
    });
  }

  if (totalPoints > 0) {
    const flexEntry = assetBreakdowns.find((entry) => entry.position === 'FLEX');
    const flexValue = positionPoints.flex;
    let manufacturerTotal = positionPoints.mfg1 + positionPoints.mfg2;
    let cultivationTotal = positionPoints.cstr1 + positionPoints.cstr2 + positionPoints.prd1 + positionPoints.prd2;
    let retailTotal = positionPoints.phm1 + positionPoints.phm2;
    let brandTotal = positionPoints.brd1;

    if (flexValue > 0 && flexEntry) {
      if (flexEntry.assetType === 'manufacturer') manufacturerTotal += flexValue;
      else if (flexEntry.assetType === 'cannabis_strain' || flexEntry.assetType === 'product') cultivationTotal += flexValue;
      else if (flexEntry.assetType === 'pharmacy') retailTotal += flexValue;
      else if (flexEntry.assetType === 'brand') brandTotal += flexValue;
    }

    const groups = [manufacturerTotal, cultivationTotal, retailTotal, brandTotal];
    const percentages = groups.map((value) => (totalPoints > 0 ? value / totalPoints : 0));
    const diversityAchieved =
      percentages.every((percent) => percent >= 0.18 && percent <= 0.32) && groups.every((value) => value > 0);

    if (diversityAchieved) {
      baseBonuses.push({
        type: 'Position Diversity',
        condition: 'All categories contribute 18%-32%',
        points: 30,
      });
    }
  }

  const momentumPlayers = assetBreakdowns.filter(
    (entry) => (entry.metadata?.rankDelta ?? 0) > 0
  ).length;
  if (momentumPlayers >= 3) {
    baseBonuses.push({
      type: 'Momentum Master',
      condition: '3+ assets gained rank this period',
      points: 20,
    });
  }

  const formatBonuses = calculateFormatBonuses(scope, assetBreakdowns, positionPoints, totalPoints);

  const appendBonus = (bonus: TeamBonusEntry | null) => {
    if (!bonus || bonus.points <= 0 || remainingCap <= 0) {
      return;
    }
    const appliedPoints = Math.min(remainingCap, bonus.points);
    appliedBonuses.push({ ...bonus, points: appliedPoints });
    remainingCap -= appliedPoints;
  };

  baseBonuses.forEach(appendBonus);
  formatBonuses.forEach(appendBonus);

  const totalBonus = appliedBonuses.reduce((sum, bonus) => sum + bonus.points, 0);

  return { bonuses: appliedBonuses, totalBonus };
}

function calculateFormatBonuses(
  scope: ScoreScope,
  assetBreakdowns: Array<{ metadata?: ScoreMetadata }>,
  positionPoints: PositionPointsMap,
  totalPoints: number
): TeamBonusEntry[] {
  const bonuses: TeamBonusEntry[] = [];

  if (scope.type === 'daily') {
    const hotStreakCount = assetBreakdowns.filter(
      (entry) => (entry.metadata?.streakDays ?? 0) >= 3
    ).length;
    if (hotStreakCount >= 2) {
      bonuses.push({
        type: 'Hot Streak Squad',
        condition: '2+ assets on 3-day streaks',
        points: 25,
      });
    }

    const hasTrendExplosion = assetBreakdowns.some(
      (entry) => (entry.metadata?.trendMultiplier ?? 1) >= 3
    );
    if (hasTrendExplosion) {
      bonuses.push({
        type: 'Trend Explosion',
        condition: 'At least one asset 3× above baseline',
        points: 30,
      });
    }

    const darkHorse = assetBreakdowns.some((entry) => {
      const currentRank = entry.metadata?.currentRank ?? 0;
      const previousRank = entry.metadata?.previousRank ?? 0;
      return currentRank > 0 && currentRank <= 10 && previousRank - currentRank >= 10;
    });
    if (darkHorse) {
      bonuses.push({
        type: 'Dark Horse',
        condition: 'Asset jumped 10+ ranks into top 10',
        points: 20,
      });
    }
    return bonuses;
  }

  const values = Object.values(positionPoints);
  const stdDev = computeStdDev(values);
  if (totalPoints > 0 && stdDev <= totalPoints * 0.08) {
    bonuses.push({
      type: 'Consistency King',
      condition: 'All starters within 8% variance',
      points: 25,
    });
  }

  const steadyClimbPlayers = assetBreakdowns.filter(
    (entry) => (entry.metadata?.rankDelta ?? 0) >= 2
  ).length;
  if (steadyClimbPlayers >= 2) {
    bonuses.push({
      type: 'Steady Climb',
      condition: '2+ assets gained 2+ ranks',
      points: 20,
    });
  }

  const hasMarketLeader = assetBreakdowns.some(
    (entry) => (entry.metadata?.marketSharePercent ?? 0) >= 10
  );
  if (hasMarketLeader) {
    bonuses.push({
      type: 'Market Leader',
      condition: 'Asset with ≥10% share',
      points: 20,
    });
  }

  return bonuses;
}

// ============================================================================
// WEEKLY SCORING EXECUTION
// ============================================================================

/**
 * Calculate scores for all teams in a league for a specific week
 * using daily-style scoring aggregated across the ISO week.
 */
export async function calculateWeeklyScores(leagueId: number, year: number, week: number): Promise<void> {
  console.log(`[Scoring] Calculating season scores from daily stats for league ${leagueId}, ${year}-W${week}...`);

  try {
    const teamScores = await aggregateSeasonWeeklyScores(leagueId, year, week);

    teamScores.forEach((score) => {
      wsManager.broadcastToLeague(leagueId, {
        type: 'team_score_calculated',
        teamId: score.teamId,
        teamName: score.teamName,
        points: score.points,
        year,
        week,
        timestamp: Date.now(),
      });
    });

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
 * Calculate scores for a single team in a league for a specific week.
 */
export async function calculateSeasonTeamWeek(
  leagueId: number,
  teamId: number,
  year: number,
  week: number
): Promise<number> {
  const results = await aggregateSeasonWeeklyScores(leagueId, year, week, { teamIds: [teamId] });
  const match = results.find((result) => result.teamId === teamId);
  return match?.points ?? 0;
}

type AggregateWeeklyOptions = {
  teamIds?: number[];
};

async function aggregateSeasonWeeklyScores(
  leagueId: number,
  year: number,
  week: number,
  options: AggregateWeeklyOptions = {}
): Promise<Array<{ teamId: number; teamName: string; points: number }>> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const leagueTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
    })
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  const targetTeams = options.teamIds?.length
    ? leagueTeams.filter((team) => options.teamIds!.includes(team.id))
    : leagueTeams;

  if (targetTeams.length === 0) {
    console.warn(`[Scoring] No teams to score for league ${leagueId}`);
    return [];
  }

  const scarcityMultipliers = await getScarcityMultipliers(db);
  const { startDate, endDate } = getWeekDateRange(year, week);
  const weekDates = enumerateWeekDates(startDate, endDate);

  // REFACTORED: Use unified weekly scoring instead of aggregating daily scores
  // This allows us to use weekly metrics (growth, rank change) + aggregated daily metrics
  const teamScores = await Promise.all(
    targetTeams.map(async (team) => {
      try {
        const result = await computeTeamScore({
          teamId: team.id,
          lineupYear: year,
          lineupWeek: week,
          scope: { type: 'weekly', year, week },
          persistence: { mode: 'weekly', teamId: team.id, year, week },
          scarcityMultipliers,
        });

        return {
          teamId: team.id,
          teamName: team.name,
          points: result.totalPoints,
          breakdown: result.breakdowns,
        };
      } catch (error) {
        console.error(`[Scoring] Error calculating weekly score for team ${team.id}:`, error);
        return {
          teamId: team.id,
          teamName: team.name,
          points: 0,
          breakdown: [],
        };
      }
    })
  );

  // Filter out teams that had errors and return only the points for now
  // The full breakdown will be persisted by computeTeamScore
  return teamScores.map(({ teamId, teamName, points }) => ({ teamId, teamName, points }));
}

type TeamAggregationParams = {
  db: Awaited<ReturnType<typeof getDb>>;
  team: { id: number; name: string };
  leagueId: number;
  year: number;
  week: number;
  weekDates: string[];
  scarcityMultipliers: ScarcityMultipliers;
};

async function aggregateTeamWeekFromDaily(params: TeamAggregationParams): Promise<number> {
  const aggregatedPositionPoints = createEmptyPositionPoints();
  const breakdownAccumulators = new Map<string, BreakdownAccumulator>();
  let totalPoints = 0;
  let totalTeamBonus = 0;

  for (const statDate of params.weekDates) {
    const dailyResult = await computeTeamScore({
      teamId: params.team.id,
      lineupYear: params.year,
      lineupWeek: params.week,
      scope: { type: 'daily', statDate },
      persistence: { mode: 'daily', teamId: params.team.id, challengeId: params.leagueId, statDate },
      scarcityMultipliers: params.scarcityMultipliers,
      skipPersistence: true,
    });

    totalPoints += dailyResult.totalPoints;
    totalTeamBonus += dailyResult.teamBonusTotal;
    addPositionPoints(aggregatedPositionPoints, dailyResult.positionPoints);

    for (const breakdown of dailyResult.breakdowns) {
      const accumulator = getOrCreateBreakdownAccumulator(
        breakdownAccumulators,
        breakdown.position,
        breakdown.assetType,
        breakdown.assetId
      );
      accumulator.totalPoints += breakdown.points;
      accumulateBreakdownDetail(accumulator, breakdown.breakdown);
    }
  }

  const aggregatedBreakdowns = Array.from(breakdownAccumulators.values()).map(finalizeBreakdownAccumulator);

  await persistTeamScore(params.db, {
    persistence: { mode: 'weekly', teamId: params.team.id, year: params.year, week: params.week },
    positionPoints: aggregatedPositionPoints,
    totalPoints,
    totalBonus: totalTeamBonus,
    breakdowns: aggregatedBreakdowns.map((entry) => ({
      position: entry.position,
      assetType: entry.assetType,
      assetId: entry.assetId,
      breakdown: entry.breakdown,
      points: entry.breakdown.total,
    })),
  });

  return totalPoints;
}

type BreakdownAccumulator = {
  position: string;
  assetType: AssetType;
  assetId: number;
  components: Map<string, BreakdownComponent>;
  bonuses: Map<string, BreakdownBonus>;
  penalties: Map<string, BreakdownBonus>;
  totalPoints: number;
};

function createEmptyPositionPoints(): PositionPointsMap {
  return {
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
}

function addPositionPoints(target: PositionPointsMap, source: PositionPointsMap) {
  target.mfg1 += source.mfg1;
  target.mfg2 += source.mfg2;
  target.cstr1 += source.cstr1;
  target.cstr2 += source.cstr2;
  target.prd1 += source.prd1;
  target.prd2 += source.prd2;
  target.phm1 += source.phm1;
  target.phm2 += source.phm2;
  target.brd1 += source.brd1;
  target.flex += source.flex;
}

function getOrCreateBreakdownAccumulator(
  map: Map<string, BreakdownAccumulator>,
  position: string,
  assetType: AssetType,
  assetId: number
): BreakdownAccumulator {
  const existing = map.get(position);
  if (existing) {
    return existing;
  }
  const accumulator: BreakdownAccumulator = {
    position,
    assetType,
    assetId,
    components: new Map(),
    bonuses: new Map(),
    penalties: new Map(),
    totalPoints: 0,
  };
  map.set(position, accumulator);
  return accumulator;
}

function accumulateBreakdownDetail(target: BreakdownAccumulator, detail: BreakdownDetail) {
  detail.components.forEach((component) => {
    const key = `${component.category}|${component.formula ?? ''}`;
    const existing =
      target.components.get(key) ??
      {
        category: component.category,
        value: typeof component.value === 'number' ? component.value : 'Weekly aggregate',
        formula: component.formula ? `${component.formula} (weekly sum)` : `${component.category} (weekly sum)`,
        points: 0,
      };
    existing.points += component.points || 0;
    target.components.set(key, existing);
  });

  detail.bonuses?.forEach((bonus) => {
    const key = `${bonus.type}|${bonus.condition}`;
    const existing =
      target.bonuses.get(key) ??
      {
        type: bonus.type,
        condition: bonus.condition,
        points: 0,
      };
    existing.points += bonus.points || 0;
    target.bonuses.set(key, existing);
  });

  detail.penalties?.forEach((penalty) => {
    const key = `${penalty.type}|${penalty.condition}`;
    const existing =
      target.penalties.get(key) ??
      {
        type: penalty.type,
        condition: penalty.condition,
        points: 0,
      };
    existing.points += penalty.points || 0;
    target.penalties.set(key, existing);
  });
}

function finalizeBreakdownAccumulator(acc: BreakdownAccumulator) {
  const components = Array.from(acc.components.values());
  const bonuses = Array.from(acc.bonuses.values());
  const penalties = Array.from(acc.penalties.values());
  const subtotal = components.reduce((sum, component) => sum + (component.points || 0), 0);
  const bonusTotal = bonuses.reduce((sum, bonus) => sum + (bonus.points || 0), 0);
  const penaltyTotal = penalties.reduce((sum, penalty) => sum + (penalty.points || 0), 0);
  const total = subtotal + bonusTotal + penaltyTotal;

  return {
    position: acc.position,
    assetType: acc.assetType,
    assetId: acc.assetId,
    breakdown: {
      components,
      bonuses,
      penalties,
      subtotal,
      total,
    },
  };
}

function enumerateWeekDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Calculate score for a single team for a specific challenge day
 */
export async function calculateTeamDailyScore(
  teamId: number,
  challengeId: number,
  statDate: string,
  options: { scarcityMultipliers?: ScarcityMultipliers } = {}
): Promise<number> {
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
    scarcityMultipliers: options.scarcityMultipliers,
  });
  console.log(`[calculateTeamDailyScore] Calculated score for team ${teamId}: ${score.totalPoints} points`);
  return score.totalPoints;
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

  const scarcityMultipliers = await getScarcityMultipliers(db);

  // Calculate scores for all teams in parallel for better performance
  await Promise.all(
    challengeTeams.map(async (team) => {
      try {
        console.log(`[calculateDailyChallengeScores] Processing team ${team.id} (${team.name})`);
        await calculateTeamDailyScore(team.id, challengeId, statDateString, {
          scarcityMultipliers,
        });
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
  scarcityMultipliers?: ScarcityMultipliers;
  skipPersistence?: boolean;
}

async function computeTeamScore(options: TeamScoreComputationOptions): Promise<TeamScoreComputationResult> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }
  const scarcityMultipliers =
    options.scarcityMultipliers ?? (await getScarcityMultipliers(db));

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
    const emptyPositionPoints = createEmptyPositionPoints();
    return {
      totalPoints: 0,
      positionPoints: emptyPositionPoints,
      breakdowns: [],
      teamBonusTotal: 0,
      teamBonuses: [],
    };
  }

  const positionPoints: PositionPointsMap = {
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
    const result = await scoreManufacturer(teamLineup.mfg1Id, scope, scarcityMultipliers);
    positionPoints.mfg1 = result.points;
    breakdowns.push({ position: 'MFG1', assetType: 'manufacturer', assetId: teamLineup.mfg1Id, ...result });
  }

  if (teamLineup.mfg2Id) {
    const result = await scoreManufacturer(teamLineup.mfg2Id, scope, scarcityMultipliers);
    positionPoints.mfg2 = result.points;
    breakdowns.push({ position: 'MFG2', assetType: 'manufacturer', assetId: teamLineup.mfg2Id, ...result });
  }

  if (teamLineup.cstr1Id) {
    const result = await scoreCannabisStrain(teamLineup.cstr1Id, scope, scarcityMultipliers);
    positionPoints.cstr1 = result.points;
    breakdowns.push({ position: 'CSTR1', assetType: 'cannabis_strain', assetId: teamLineup.cstr1Id, ...result });
  }

  if (teamLineup.cstr2Id) {
    const result = await scoreCannabisStrain(teamLineup.cstr2Id, scope, scarcityMultipliers);
    positionPoints.cstr2 = result.points;
    breakdowns.push({ position: 'CSTR2', assetType: 'cannabis_strain', assetId: teamLineup.cstr2Id, ...result });
  }

  if (teamLineup.prd1Id) {
    const result = await scoreProduct(teamLineup.prd1Id, scope, scarcityMultipliers);
    positionPoints.prd1 = result.points;
    breakdowns.push({ position: 'PRD1', assetType: 'product', assetId: teamLineup.prd1Id, ...result });
  }

  if (teamLineup.prd2Id) {
    const result = await scoreProduct(teamLineup.prd2Id, scope, scarcityMultipliers);
    positionPoints.prd2 = result.points;
    breakdowns.push({ position: 'PRD2', assetType: 'product', assetId: teamLineup.prd2Id, ...result });
  }

  if (teamLineup.phm1Id) {
    const result = await scorePharmacy(teamLineup.phm1Id, scope, scarcityMultipliers);
    positionPoints.phm1 = result.points;
    breakdowns.push({ position: 'PHM1', assetType: 'pharmacy', assetId: teamLineup.phm1Id, ...result });
  }

  if (teamLineup.phm2Id) {
    const result = await scorePharmacy(teamLineup.phm2Id, scope, scarcityMultipliers);
    positionPoints.phm2 = result.points;
    breakdowns.push({ position: 'PHM2', assetType: 'pharmacy', assetId: teamLineup.phm2Id, ...result });
  }

  if (teamLineup.brd1Id) {
    const result = await scoreBrand(teamLineup.brd1Id, scope, scarcityMultipliers);
    positionPoints.brd1 = result.points;
    breakdowns.push({ position: 'BRD1', assetType: 'brand', assetId: teamLineup.brd1Id, ...result });
  }

  if (teamLineup.flexId && teamLineup.flexType) {
    let result;
    if (teamLineup.flexType === 'manufacturer') {
      result = await scoreManufacturer(teamLineup.flexId, scope, scarcityMultipliers);
    } else if (teamLineup.flexType === 'brand') {
      result = await scoreBrand(teamLineup.flexId, scope, scarcityMultipliers);
    } else if (teamLineup.flexType === 'cannabis_strain') {
      result = await scoreCannabisStrain(teamLineup.flexId, scope, scarcityMultipliers);
    } else if (teamLineup.flexType === 'product') {
      result = await scoreProduct(teamLineup.flexId, scope, scarcityMultipliers);
    } else {
      result = await scorePharmacy(teamLineup.flexId, scope, scarcityMultipliers);
    }
    positionPoints.flex = result.points;
    breakdowns.push({ position: 'FLEX', assetType: teamLineup.flexType, assetId: teamLineup.flexId, ...result });
  }

  const subtotal = Object.values(positionPoints).reduce((sum, pts) => sum + pts, 0);

  const { bonuses: teamBonuses, totalBonus } = calculateTeamBonuses(
    subtotal,
    positionPoints,
    breakdowns,
    scope
  );

  const totalPoints = subtotal + totalBonus;

  const result: TeamScoreComputationResult = {
    totalPoints,
    positionPoints,
    breakdowns,
    teamBonusTotal: totalBonus,
    teamBonuses,
  };

  if (!options.skipPersistence) {
    await persistTeamScore(db, {
      persistence: options.persistence,
      positionPoints,
      totalPoints,
      totalBonus,
      breakdowns,
    });
  }

  console.log(`[Scoring] Team ${options.teamId} scored ${totalPoints} points (${options.persistence.mode})`);

  return result;
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

  await db.transaction(async (tx) => {
    if (params.persistence.mode === 'weekly') {
      const upserted = await tx.insert(weeklyTeamScores)
        .values({
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
        })
        .onConflictDoUpdate({
          target: [weeklyTeamScores.teamId, weeklyTeamScores.year, weeklyTeamScores.week],
          set: {
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
          },
        })
        .returning({ id: weeklyTeamScores.id });

      const scoreId = upserted[0].id;

      await tx.execute(sql`select pg_advisory_xact_lock(${scoreId})`);

      await tx.delete(scoringBreakdowns)
        .where(eq(scoringBreakdowns.weeklyTeamScoreId, scoreId));

      if (params.breakdowns.length > 0) {
        await tx.insert(scoringBreakdowns).values(
          params.breakdowns.map((breakdown) => ({
            weeklyTeamScoreId: scoreId,
            assetType: breakdown.assetType as any,
            assetId: breakdown.assetId,
            position: breakdown.position,
            breakdown: breakdown.breakdown,
            totalPoints: breakdown.points,
          }))
        );
      }
    } else {
      const upserted = await tx.insert(dailyTeamScores)
        .values({
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
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: [dailyTeamScores.challengeId, dailyTeamScores.teamId, dailyTeamScores.statDate],
          set: {
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
          },
        })
        .returning({ id: dailyTeamScores.id });

      const scoreId = upserted[0].id;

      await tx.execute(sql`select pg_advisory_xact_lock(${scoreId})`);

      await tx.delete(dailyScoringBreakdowns)
        .where(eq(dailyScoringBreakdowns.dailyTeamScoreId, scoreId));

      if (params.breakdowns.length > 0) {
        await tx.insert(dailyScoringBreakdowns).values(
          params.breakdowns.map((breakdown) => ({
            dailyTeamScoreId: scoreId,
            assetType: breakdown.assetType as any,
            assetId: breakdown.assetId,
            position: breakdown.position,
            breakdown: breakdown.breakdown,
            totalPoints: breakdown.points,
          }))
        );
      }
    }
  });
}

/**
 * Score a manufacturer for a specific week
 */
async function scoreManufacturer(
  manufacturerId: number,
  scope: ScoreScope,
  scarcityMultipliers: ScarcityMultipliers
): Promise<AssetScoreResult> {
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
    return { points: 0, breakdown: createEmptyBreakdown('No Data') };
  }

  const statRecord = stats[0];

  // For weekly scoring, calculate points using formula
  if (scope.type === 'weekly') {
    const weeklyStat = statRecord as typeof manufacturerWeeklyStats.$inferSelect;

    // 1. Manufacturers
    const dailyStats = await db
      .select()
      .from(manufacturerDailyChallengeStats)
      .where(and(
        eq(manufacturerDailyChallengeStats.manufacturerId, manufacturerId),
        gte(manufacturerDailyChallengeStats.statDate, startDate),
        lte(manufacturerDailyChallengeStats.statDate, endDate)
      ));

    const { points, breakdown } = calculateManufacturerPoints(dailyStats, {
      rankChange: weeklyStat.rankChange,
      marketShareRank: weeklyStat.marketShareRank,
      marketSharePercent: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].marketSharePercent ?? 0) : 0,
      streakDays: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].streakDays ?? 0) : 0,
    });

    const currentRank = weeklyStat.marketShareRank ?? 0;
    const rankChange = weeklyStat.rankChange ?? 0;
    const metadata: ScoreMetadata = {
      scopeType: 'weekly',
      rankDelta: rankChange,
      currentRank,
      previousRank: currentRank + (rankChange ? rankChange : 0),
      marketSharePercent: 0,
    };

    return applyScarcityAdjustment(
      { points, breakdown, metadata },
      'manufacturer',
      scarcityMultipliers.manufacturer
    );
  }

  const dailyStat = statRecord as ManufacturerDailyStat;
  const breakdownResult = buildManufacturerDailyBreakdown(dailyStat);

  const rank = dailyStat.rank ?? 0;
  const previousRank = dailyStat.previousRank ?? rank;
  const metadata: ScoreMetadata = {
    scopeType: 'daily',
    rankDelta: previousRank - rank,
    currentRank: rank,
    previousRank,
    marketSharePercent: Number(dailyStat.marketSharePercent ?? 0),
    trendMultiplier: Number(dailyStat.trendMultiplier ?? 1) || 1,
    streakDays: Number(dailyStat.streakDays ?? 0),
  };

  return applyScarcityAdjustment(
    { ...breakdownResult, metadata },
    'manufacturer',
    scarcityMultipliers.manufacturer
  );
}

/**
 * Score a cannabis strain (genetics/cultivar) for a specific week
 * Cannabis strains score based on aggregate metrics across all products using that strain
 */
async function scoreCannabisStrain(
  cannabisStrainId: number,
  scope: ScoreScope,
  scarcityMultipliers: ScarcityMultipliers
): Promise<AssetScoreResult> {
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
    const { startDate, endDate } = getWeekDateRange(scope.year, scope.week);
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

    const metadata: ScoreMetadata = {
      scopeType: 'weekly',
      rankDelta: 0,
      currentRank: 0,
      previousRank: 0,
      marketSharePercent: weeklyStat.marketPenetration ?? 0,
    };

    return applyScarcityAdjustment(
      { ...result, metadata },
      'cannabis_strain',
      scarcityMultipliers.cannabis_strain
    );
  }

  const dailyStat = statRecord as StrainDailyStat;
  const breakdownResult = buildStrainDailyBreakdown(dailyStat);

  const rank = dailyStat.rank ?? 0;
  const previousRank = dailyStat.previousRank ?? rank;
  const metadata: ScoreMetadata = {
    scopeType: 'daily',
    rankDelta: previousRank - rank,
    currentRank: rank,
    previousRank,
    marketSharePercent: Number(dailyStat.marketSharePercent ?? 0),
    trendMultiplier: Number(dailyStat.trendMultiplier ?? 1) || 1,
    streakDays: Number(dailyStat.streakDays ?? 0),
  };

  return applyScarcityAdjustment(
    { ...breakdownResult, metadata },
    'cannabis_strain',
    scarcityMultipliers.cannabis_strain
  );
}

/**
 * Score a product (pharmaceutical product) for a specific week
 */
async function scoreProduct(
  productId: number,
  scope: ScoreScope,
  scarcityMultipliers: ScarcityMultipliers
): Promise<AssetScoreResult> {
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
    return { points: 0, breakdown: createEmptyBreakdown('No Data') };
  }

  const statRecord = stats[0];

  if (scope.type === 'weekly') {
    const weeklyStat = statRecord as typeof strainWeeklyStats.$inferSelect;
    // Fetch additional metrics from daily stats
    const { startDate, endDate } = getWeekDateRange(scope.year, scope.week);
    // 2. Strains (Products)
    const dailyStats = await db
      .select()
      .from(strainDailyChallengeStats)
      .where(and(
        eq(strainDailyChallengeStats.strainId, productId),
        gte(strainDailyChallengeStats.statDate, startDate),
        lte(strainDailyChallengeStats.statDate, endDate)
      ));

    const { points, breakdown } = calculateStrainPoints(dailyStats, {
      isTrending: false, // Need to fetch this if available in weekly stats
      streakDays: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].streakDays ?? 0) : 0,
      marketSharePercent: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].marketSharePercent ?? 0) : 0,
    });

    const currentRank = dailyStats.length > 0 ? (dailyStats[dailyStats.length - 1].rank ?? 0) : 0;
    const previousRank = dailyStats.length > 0 ? (dailyStats[dailyStats.length - 1].previousRank ?? currentRank) : currentRank;

    const metadata: ScoreMetadata = {
      scopeType: 'weekly',
      rankDelta: previousRank - currentRank,
      currentRank,
      previousRank,
      marketSharePercent: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].marketSharePercent ?? 0) : 0,
      trendMultiplier: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].trendMultiplier ?? 1) : 1,
      streakDays: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].streakDays ?? 0) : 0,
    };

    return applyScarcityAdjustment(
      { points, breakdown, metadata },
      'product',
      scarcityMultipliers.product
    );
  }

  const dailyStat = statRecord as ProductDailyStat;
  const breakdownResult = buildProductDailyBreakdown(dailyStat);

  const rank = dailyStat.rank ?? 0;
  const previousRank = dailyStat.previousRank ?? rank;
  const metadata: ScoreMetadata = {
    scopeType: 'daily',
    rankDelta: previousRank - rank,
    currentRank: rank,
    previousRank,
    marketSharePercent: Number(dailyStat.marketSharePercent ?? 0),
    trendMultiplier: Number(dailyStat.trendMultiplier ?? 1) || 1,
    streakDays: Number(dailyStat.streakDays ?? 0),
  };

  return applyScarcityAdjustment(
    { ...breakdownResult, metadata },
    'product',
    scarcityMultipliers.product
  );
}

/**
 * Score a pharmacy for a specific week
 */
async function scorePharmacy(
  pharmacyId: number,
  scope: ScoreScope,
  scarcityMultipliers: ScarcityMultipliers
): Promise<AssetScoreResult> {
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
    return { points: 0, breakdown: createEmptyBreakdown('No Data') };
  }

  const statRecord = stats[0];

  // For weekly scoring, calculate points using formula
  if (scope.type === 'weekly') {
    const weeklyStat = statRecord as typeof pharmacyWeeklyStats.$inferSelect;
    // Fetch additional metrics from daily stats
    const { startDate, endDate } = getWeekDateRange(scope.year, scope.week);
    // 3. Pharmacies
    const dailyStats = await db
      .select()
      .from(pharmacyDailyChallengeStats)
      .where(and(
        eq(pharmacyDailyChallengeStats.pharmacyId, pharmacyId),
        gte(pharmacyDailyChallengeStats.statDate, startDate),
        lte(pharmacyDailyChallengeStats.statDate, endDate)
      ));

    const { points, breakdown } = calculatePharmacyPoints(dailyStats, {
      rankChange: weeklyStat.rankChange,
      streakDays: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].streakDays ?? 0) : 0,
      marketSharePercent: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].marketSharePercent ?? 0) : 0,
    });

    const currentRank = dailyStats.length > 0 ? (dailyStats[dailyStats.length - 1].rank ?? 0) : 0;
    const previousRank = dailyStats.length > 0 ? (dailyStats[dailyStats.length - 1].previousRank ?? currentRank) : currentRank;

    const metadata: ScoreMetadata = {
      scopeType: 'weekly',
      rankDelta: previousRank - currentRank,
      currentRank,
      previousRank,
      marketSharePercent: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].marketSharePercent ?? 0) : 0,
      trendMultiplier: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].trendMultiplier ?? 1) : 1,
      streakDays: dailyStats.length > 0 ? Number(dailyStats[dailyStats.length - 1].streakDays ?? 0) : 0,
    };

    return applyScarcityAdjustment(
      { points, breakdown, metadata },
      'pharmacy',
      scarcityMultipliers.pharmacy
    );
  }

  const dailyStat = statRecord as PharmacyDailyStat;
  const breakdownResult = buildPharmacyDailyBreakdown(dailyStat);

  const rank = dailyStat.rank ?? 0;
  const previousRank = dailyStat.previousRank ?? rank;
  const metadata: ScoreMetadata = {
    scopeType: 'daily',
    rankDelta: previousRank - rank,
    currentRank: rank,
    previousRank,
    marketSharePercent: Number(dailyStat.marketSharePercent ?? 0),
    trendMultiplier: Number(dailyStat.trendMultiplier ?? 1) || 1,
    streakDays: Number(dailyStat.streakDays ?? 0),
  };

  return applyScarcityAdjustment(
    { ...breakdownResult, metadata },
    'pharmacy',
    scarcityMultipliers.pharmacy
  );
}

/**
 * Score a brand for a specific week
 */
async function scoreBrand(
  brandId: number,
  scope: ScoreScope,
  scarcityMultipliers: ScarcityMultipliers
): Promise<AssetScoreResult> {
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
    return { points: 0, breakdown: createEmptyBreakdown('No Data') };
  }

  const statRecord = stats[0];

  // For weekly scoring, calculate points using formula
  if (scope.type === 'weekly') {
    const weeklyStat = statRecord as typeof brandWeeklyStats.$inferSelect;
    const result = calculateBrandPoints({
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

    const metadata: ScoreMetadata = {
      scopeType: 'weekly',
      rankDelta: 0,
      currentRank: 0,
      previousRank: 0,
      marketSharePercent: 0,
    };

    return applyScarcityAdjustment(
      { ...result, metadata },
      'brand',
      scarcityMultipliers.brand
    );
  }

  const dailyStat = statRecord as BrandDailyStat;
  const breakdownResult = buildBrandDailyBreakdown(dailyStat);
  const rank = dailyStat.rank ?? 0;
  const metadata: ScoreMetadata = {
    scopeType: 'daily',
    rankDelta: 0,
    currentRank: rank,
    previousRank: rank,
    marketSharePercent: 0,
  };

  return applyScarcityAdjustment(
    { ...breakdownResult, metadata },
    'brand',
    scarcityMultipliers.brand
  );
}
