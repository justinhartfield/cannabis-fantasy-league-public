/**
 * Daily Challenge Scoring Engine
 * Optimized for single-day performance with simplified scoring rules
 */

export interface DailyChallengeStats {
  salesVolumeGrams?: number;
  orderCount?: number;
  revenueCents?: number;
  // Brand-specific fields
  totalRatings?: number;
  averageRating?: number | string;
  bayesianAverage?: number | string;
  veryGoodCount?: number;
  goodCount?: number;
  acceptableCount?: number;
  badCount?: number;
  veryBadCount?: number;
}

export interface ScoringBreakdown {
  salesVolumePoints: number;
  orderCountPoints: number;
  revenuePoints: number;
  ratingCountPoints?: number;
  ratingQualityPoints?: number;
  rankBonusPoints: number;
  totalPoints: number;
}

/**
 * Calculate manufacturer daily challenge score
 */
export function calculateManufacturerScore(
  stats: DailyChallengeStats,
  rank: number = 0
): ScoringBreakdown {
  const salesVolumeGrams = stats.salesVolumeGrams || 0;
  const orderCount = stats.orderCount || 0;
  const revenueCents = stats.revenueCents || 0;

  // Sales Volume: 1 point per 10g sold
  const salesVolumePoints = Math.floor(salesVolumeGrams / 10);

  // Order Count: 5 points per order
  const orderCountPoints = orderCount * 5;

  // Revenue: 1 point per €10 revenue (1000 cents)
  const revenuePoints = Math.floor(revenueCents / 1000);

  // Top Seller Bonus: +50 points for #1 manufacturer
  const rankBonusPoints = rank === 1 ? 50 : 0;

  const totalPoints = salesVolumePoints + orderCountPoints + revenuePoints + rankBonusPoints;

  return {
    salesVolumePoints,
    orderCountPoints,
    revenuePoints,
    rankBonusPoints,
    totalPoints,
  };
}

/**
 * Calculate strain daily challenge score
 * Strains get a 2x multiplier to balance against manufacturers
 */
export function calculateStrainScore(
  stats: DailyChallengeStats,
  rank: number = 0
): ScoringBreakdown {
  const salesVolumeGrams = stats.salesVolumeGrams || 0;
  const orderCount = stats.orderCount || 0;

  // Sales Volume: 2 points per 10g sold (2x multiplier)
  const salesVolumePoints = Math.floor(salesVolumeGrams / 10) * 2;

  // Order Count: 10 points per order (2x multiplier)
  const orderCountPoints = orderCount * 10;

  // Popularity Bonus: +40 points for #1 strain
  const rankBonusPoints = rank === 1 ? 40 : 0;

  const totalPoints = salesVolumePoints + orderCountPoints + rankBonusPoints;

  return {
    salesVolumePoints,
    orderCountPoints,
    revenuePoints: 0,
    rankBonusPoints,
    totalPoints,
  };
}

/**
 * Calculate product daily challenge score
 * Products get a 3x multiplier to balance against manufacturers
 * (Products typically have lower individual sales than aggregated strains)
 */
export function calculateProductScore(
  stats: DailyChallengeStats,
  rank: number = 0
): ScoringBreakdown {
  const salesVolumeGrams = stats.salesVolumeGrams || 0;
  const orderCount = stats.orderCount || 0;

  // Sales Volume: 3 points per 10g sold (3x multiplier)
  const salesVolumePoints = Math.floor(salesVolumeGrams / 10) * 3;

  // Order Count: 15 points per order (3x multiplier)
  const orderCountPoints = orderCount * 15;

  // Top Product Bonus: +50 points for #1 product
  const rankBonusPoints = rank === 1 ? 50 : 0;

  const totalPoints = salesVolumePoints + orderCountPoints + rankBonusPoints;

  return {
    salesVolumePoints,
    orderCountPoints,
    revenuePoints: 0,
    rankBonusPoints,
    totalPoints,
  };
}

/**
 * Calculate pharmacy daily challenge score
 */
export function calculatePharmacyScore(
  stats: DailyChallengeStats,
  rank: number = 0
): ScoringBreakdown {
  const orderCount = stats.orderCount || 0;
  const revenueCents = stats.revenueCents || 0;

  // Order Count: 10 points per order
  const orderCountPoints = orderCount * 10;

  // Revenue: 1 point per €10 revenue (1000 cents)
  const revenuePoints = Math.floor(revenueCents / 1000);

  // Top Pharmacy Bonus: +40 points for #1 pharmacy
  const rankBonusPoints = rank === 1 ? 40 : 0;

  const totalPoints = orderCountPoints + revenuePoints + rankBonusPoints;

  return {
    salesVolumePoints: 0,
    orderCountPoints,
    revenuePoints,
    rankBonusPoints,
    totalPoints,
  };
}

/**
 * Calculate brand daily challenge score based on ratings
 * Brands are scored differently from manufacturers/pharmacies
 * They use user ratings data instead of sales volume
 */
export function calculateBrandScore(
  stats: DailyChallengeStats,
  rank: number = 0
): ScoringBreakdown {
  const totalRatings = stats.totalRatings || 0;
  const averageRating = parseFloat(stats.averageRating?.toString() || '0');
  const bayesianAverage = parseFloat(stats.bayesianAverage?.toString() || '0');

  // Rating Count: 10 points per rating received
  const ratingCountPoints = totalRatings * 10;

  // Rating Quality: 20 points per star (based on Bayesian average to prevent gaming)
  const ratingQualityPoints = Math.floor(bayesianAverage * 20);

  // Top Brand Bonus: +50 points for #1 brand by ratings
  const rankBonusPoints = rank === 1 ? 50 : 0;

  const totalPoints = ratingCountPoints + ratingQualityPoints + rankBonusPoints;

  return {
    salesVolumePoints: 0,
    orderCountPoints: 0,
    revenuePoints: 0,
    ratingCountPoints,
    ratingQualityPoints,
    rankBonusPoints,
    totalPoints,
  };
}

/**
 * Scoring Rules Documentation
 */
export const DAILY_CHALLENGE_SCORING_RULES = {
  manufacturer: {
    salesVolume: { formula: 'Sales (g) ÷ 10', points: '1 pt per 10g' },
    orderCount: { formula: 'Order count × 5', points: '5 pts per order' },
    revenue: { formula: 'Revenue (€) ÷ 10', points: '1 pt per €10' },
    rankBonus: { formula: 'Rank #1', points: '+50 pts' },
  },
  strain: {
    salesVolume: { formula: 'Sales (g) ÷ 10', points: '1 pt per 10g' },
    orderCount: { formula: 'Order count × 5', points: '5 pts per order' },
    rankBonus: { formula: 'Rank #1', points: '+30 pts' },
  },
  pharmacy: {
    orderCount: { formula: 'Order count × 10', points: '10 pts per order' },
    revenue: { formula: 'Revenue (€) ÷ 10', points: '1 pt per €10' },
    rankBonus: { formula: 'Rank #1', points: '+40 pts' },
  },
  brand: {
    salesVolume: { formula: 'Sales (g) ÷ 10', points: '1 pt per 10g' },
    orderCount: { formula: 'Order count × 5', points: '5 pts per order' },
    rankBonus: { formula: 'Rank #1', points: '+35 pts' },
  },
};
