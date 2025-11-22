/**
 * Trend-Based Scoring Engine
 * 
 * Implements the new scoring system that uses relative trends instead of explicit sales metrics.
 * Includes: Trend Bonus, Consistency Score, Velocity Score, Streak Bonus, and Market Share Trend.
 */

export interface TrendScoringStats {
  orderCount: number;
  /**
   * Raw cumulative volumes for trend calculation.
   * Optional when a precomputed trendMultiplier is provided.
   */
  days1?: number;
  days7?: number;
  days14?: number;
  days30?: number;
  previousRank: number;
  currentRank: number;
  streakDays: number;
  marketSharePercent: number;
  /**
   * Optional precomputed values used when raw series data is not available.
   * - trendMultiplier: precomputed Days7/Days1 ratio
   * - consistencyScore: 0-100 consistency metric
   * - velocityScore: momentum/acceleration metric
   */
  trendMultiplier?: number;
  consistencyScore?: number;
  velocityScore?: number;
  dailyVolumes?: number[]; // Last 7 days for consistency calculation
}

export interface TrendScoringBreakdown {
  orderCountPoints: number;
  trendMomentumPoints: number;
  rankBonusPoints: number;
  momentumBonusPoints: number;
  consistencyBonusPoints: number;
  velocityBonusPoints: number;
  streakBonusPoints: number;
  marketShareBonusPoints: number;
  totalPoints: number;
  trendMultiplier: number;
  consistencyScore: number;
  velocityScore: number;
}

/**
 * Calculate trend multiplier from TrendMetrics data
 * Returns the Days7/Days1 ratio, handling edge cases
 * REBALANCED: Capped at 5x instead of 10x for better predictability
 */
export function calculateTrendMultiplier(days1: number, days7: number): number {
  const currentDayVolume = Math.max(days1, 0);
  const trailingSevenDayVolume = Math.max(days7, 0);

  // If no volume at all, stay neutral
  if (currentDayVolume === 0 && trailingSevenDayVolume === 0) {
    return 1.0;
  }

  const averageDailyVolume = trailingSevenDayVolume > 0
    ? trailingSevenDayVolume / 7
    : 0;

  // When we don't have 7-day history yet (average = 0), treat any positive day
  // as a hype multiplier so brand-new drops get rewarded (reduced from 10x to 5x)
  if (averageDailyVolume === 0) {
    return currentDayVolume > 0 ? 5.0 : 1.0;
  }

  const multiplier = currentDayVolume / averageDailyVolume;
  return Math.min(Math.max(multiplier, 0.1), 5.0); // Cap between 0.1x and 5x (reduced from 10x)
}

/**
 * Calculate consistency score based on variance in daily performance
 * Lower variance = higher consistency = more points
 */
export function calculateConsistencyScore(dailyVolumes: number[]): number {
  if (!dailyVolumes || dailyVolumes.length < 3) return 0;
  
  // Calculate mean
  const mean = dailyVolumes.reduce((sum, val) => sum + val, 0) / dailyVolumes.length;
  
  // Calculate standard deviation
  const squaredDiffs = dailyVolumes.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / dailyVolumes.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate coefficient of variation (CV) - normalized measure of dispersion
  const cv = mean > 0 ? stdDev / mean : 1;
  
  // Convert to consistency score (lower CV = higher score)
  // Perfect consistency (CV=0) = 100 pts, high variance (CV>=1) = 0 pts
  const consistencyScore = Math.max(0, Math.floor((1 - cv) * 100));
  
  return consistencyScore;
}

/**
 * Calculate velocity score based on acceleration (second derivative)
 * Rewards entities that are speeding up their growth
 */
export function calculateVelocityScore(days1: number, days7: number, days14?: number): number {
  if (!days14 || days14 === 0) return 0;
  
  // Calculate growth rates for two periods
  const recentGrowth = days7 - days1; // Growth from Day 1 to Day 7
  const olderGrowth = days14 - days7; // Growth from Day 7 to Day 14
  
  // Calculate acceleration (change in growth rate)
  const acceleration = recentGrowth - olderGrowth;
  
  // Convert to velocity score (positive acceleration = bonus)
  // Scale by 0.05 to keep scores reasonable
  const velocityScore = Math.floor(acceleration * 0.05);
  
  // Cap at reasonable bounds
  return Math.min(Math.max(velocityScore, -50), 100);
}

/**
 * Calculate progressive streak multiplier for consecutive days in top 10
 * Returns a multiplier that increases with streak length
 */
export function calculateStreakMultiplier(streakDays: number): number {
  if (streakDays < 2) return 1.0; // No streak bonus
  
  // Progressive streak tiers with increasing multipliers
  if (streakDays >= 21) return 3.0;  // 🔥🔥🔥🔥🔥 God Mode: 3x multiplier
  if (streakDays >= 14) return 2.0;  // 🔥🔥🔥🔥 Legendary: 2x multiplier
  if (streakDays >= 7) return 1.5;   // 🔥🔥🔥 Unstoppable: 1.5x multiplier
  if (streakDays >= 4) return 1.25;  // 🔥🔥 On Fire: 1.25x multiplier
  return 1.1;                         // 🔥 Hot Streak: 1.1x multiplier (2-3 days)
}

/**
 * Get streak tier name for display
 */
export function getStreakTierName(streakDays: number): string {
  if (streakDays >= 21) return '🔥🔥🔥🔥🔥 God Mode';
  if (streakDays >= 14) return '🔥🔥🔥🔥 Legendary';
  if (streakDays >= 7) return '🔥🔥🔥 Unstoppable';
  if (streakDays >= 4) return '🔥🔥 On Fire';
  if (streakDays >= 2) return '🔥 Hot Streak';
  return 'No Streak';
}

/**
 * Calculate streak bonus points (REBALANCED: Linear progression, capped at 15pts)
 */
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays < 2) return 0;
  
  // Linear bonus progression: 2pts per day, capped at 15pts
  return Math.min(15, streakDays * 2);
}

/**
 * Calculate market share bonus for gaining relative position
 * REBALANCED: More aggressive tiers, capped at 20pts
 */
export function calculateMarketShareBonus(marketSharePercent: number): number {
  // Award points for significant market share
  if (marketSharePercent >= 15) return 20; // Dominant player (15%+)
  if (marketSharePercent >= 8) return 15;  // Major player (8-14%)
  if (marketSharePercent >= 4) return 10;  // Significant player (4-7%)
  if (marketSharePercent >= 2) return 5;   // Notable player (2-3%)
  return 0;
}

/**
 * Calculate rank bonus based on current position (tiered)
 * REBALANCED: Unified across all positions for equal draftability
 */
export function calculateRankBonus(rank: number, entityType: 'manufacturer' | 'strain' | 'product' | 'pharmacy'): number {
  if (rank === 0) return 0; // Unranked
  
  // Unified bonus system across all positions
  if (rank === 1) return 30;        // Rank #1
  if (rank >= 2 && rank <= 3) return 20;  // Rank #2-3
  if (rank >= 4 && rank <= 5) return 15;  // Rank #4-5
  if (rank >= 6 && rank <= 10) return 10; // Rank #6-10
  return 0;
}

/**
 * Calculate momentum bonus based on rank change
 * REBALANCED: Unified across positions, capped impact
 */
export function calculateMomentumBonus(previousRank: number, currentRank: number, entityType: 'manufacturer' | 'strain' | 'product' | 'pharmacy'): number {
  if (previousRank === 0 || currentRank === 0) return 0; // No previous rank to compare
  
  const rankChange = previousRank - currentRank; // Positive = improvement
  
  // Unified bonus system: 8 pts per rank gained, -4 pts per rank lost
  // Capped at ±40 pts (max 5 rank movement impact)
  if (rankChange > 0) {
    return Math.min(40, rankChange * 8);
  } else if (rankChange < 0) {
    return Math.max(-40, rankChange * 4);
  }
  return 0;
}

/**
 * Calculate manufacturer score with new trend-based system
 * REBALANCED: Reduced multipliers, capped bonuses, target 50-120 pts
 */
export function calculateManufacturerTrendScore(stats: TrendScoringStats): TrendScoringBreakdown {
  // Base points from order count (reduced from 10 to 5)
  const orderCountPoints = stats.orderCount * 5;
  
  // Trend momentum points (reduced from 100 to 25)
  const trendMultiplier =
    typeof stats.trendMultiplier === 'number' && stats.trendMultiplier > 0
      ? Math.min(stats.trendMultiplier, 5.0) // Cap at 5x
      : calculateTrendMultiplier(stats.days1 ?? 0, stats.days7 ?? 0);
  const trendMomentumPoints = Math.floor(trendMultiplier * 25);
  
  // Rank-based bonuses (now unified)
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'manufacturer');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'manufacturer');
  
  // Advanced feature bonuses (all capped)
  const consistencyScore =
    typeof stats.consistencyScore === 'number'
      ? stats.consistencyScore
      : calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.min(20, Math.floor(consistencyScore * 0.20)); // Capped at 20
  
  const velocityScore =
    typeof stats.velocityScore === 'number'
      ? stats.velocityScore
      : calculateVelocityScore(stats.days1 ?? 0, stats.days7 ?? 0, stats.days14);
  const velocityBonusPoints = Math.min(15, Math.abs(Math.floor(velocityScore * 0.15))); // Capped at 15
  
  const streakBonusPoints = calculateStreakBonus(stats.streakDays); // Already capped at 15
  const marketShareBonusPoints = calculateMarketShareBonus(stats.marketSharePercent); // Already capped at 20
  
  // Calculate total (target: 50-120 pts base + up to 50 in bonuses)
  const totalPoints = 
    orderCountPoints +
    trendMomentumPoints +
    rankBonusPoints +
    momentumBonusPoints +
    consistencyBonusPoints +
    velocityBonusPoints +
    streakBonusPoints +
    marketShareBonusPoints;
  
  return {
    orderCountPoints,
    trendMomentumPoints,
    rankBonusPoints,
    momentumBonusPoints,
    consistencyBonusPoints,
    velocityBonusPoints,
    streakBonusPoints,
    marketShareBonusPoints,
    totalPoints,
    trendMultiplier,
    consistencyScore,
    velocityScore,
  };
}

/**
 * Calculate strain score with new trend-based system
 * REBALANCED: Similar to manufacturers, target 50-100 pts
 */
export function calculateStrainTrendScore(stats: TrendScoringStats): TrendScoringBreakdown {
  // Base points from order count (normalized to 4.5)
  const orderCountPoints = Math.floor(stats.orderCount * 4.5);
  
  // Trend momentum points (normalized to 22)
  const trendMultiplier =
    typeof stats.trendMultiplier === 'number' && stats.trendMultiplier > 0
      ? Math.min(stats.trendMultiplier, 5.0) // Cap at 5x
      : calculateTrendMultiplier(stats.days1 ?? 0, stats.days7 ?? 0);
  const trendMomentumPoints = Math.floor(trendMultiplier * 22);
  
  // Rank-based bonuses (now unified)
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'strain');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'strain');
  
  // Advanced feature bonuses (capped)
  const consistencyScore =
    typeof stats.consistencyScore === 'number'
      ? stats.consistencyScore
      : calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.min(20, Math.floor(consistencyScore * 0.20));
  
  const velocityScore =
    typeof stats.velocityScore === 'number'
      ? stats.velocityScore
      : calculateVelocityScore(stats.days1 ?? 0, stats.days7 ?? 0, stats.days14);
  const velocityBonusPoints = Math.min(15, Math.abs(Math.floor(velocityScore * 0.15)));
  
  const streakBonusPoints = calculateStreakBonus(stats.streakDays); // Already capped at 15
  const marketShareBonusPoints = calculateMarketShareBonus(stats.marketSharePercent); // Already capped at 20
  
  // Calculate total (target: 40-90 pts base + up to 50 in bonuses)
  const totalPoints = 
    orderCountPoints +
    trendMomentumPoints +
    rankBonusPoints +
    momentumBonusPoints +
    consistencyBonusPoints +
    velocityBonusPoints +
    streakBonusPoints +
    marketShareBonusPoints;
  
  return {
    orderCountPoints,
    trendMomentumPoints,
    rankBonusPoints,
    momentumBonusPoints,
    consistencyBonusPoints,
    velocityBonusPoints,
    streakBonusPoints,
    marketShareBonusPoints,
    totalPoints,
    trendMultiplier,
    consistencyScore,
    velocityScore,
  };
}

/**
 * Calculate product score with new trend-based system
 * REBALANCED: Normalized multipliers, removed 3x advantage, target 40-80 pts
 */
export function calculateProductTrendScore(stats: TrendScoringStats): TrendScoringBreakdown {
  // Base points from order count (normalized to 4, removed 3x multiplier)
  const orderCountPoints = stats.orderCount * 4;
  
  // Trend momentum points (normalized to 20, removed 3x multiplier)
  const trendMultiplier =
    typeof stats.trendMultiplier === 'number' && stats.trendMultiplier > 0
      ? Math.min(stats.trendMultiplier, 5.0) // Cap at 5x
      : calculateTrendMultiplier(stats.days1 ?? 0, stats.days7 ?? 0);
  const trendMomentumPoints = Math.floor(trendMultiplier * 20);
  
  // Rank-based bonuses (now unified)
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'product');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'product');
  
  // Advanced feature bonuses (capped)
  const consistencyScore =
    typeof stats.consistencyScore === 'number'
      ? stats.consistencyScore
      : calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.min(20, Math.floor(consistencyScore * 0.20));
  
  const velocityScore =
    typeof stats.velocityScore === 'number'
      ? stats.velocityScore
      : calculateVelocityScore(stats.days1 ?? 0, stats.days7 ?? 0, stats.days14);
  const velocityBonusPoints = Math.min(15, Math.abs(Math.floor(velocityScore * 0.15)));
  
  const streakBonusPoints = calculateStreakBonus(stats.streakDays); // Already capped at 15
  const marketShareBonusPoints = calculateMarketShareBonus(stats.marketSharePercent); // Already capped at 20
  
  // Calculate total (target: 30-70 pts base + up to 50 in bonuses)
  const totalPoints = 
    orderCountPoints +
    trendMomentumPoints +
    rankBonusPoints +
    momentumBonusPoints +
    consistencyBonusPoints +
    velocityBonusPoints +
    streakBonusPoints +
    marketShareBonusPoints;
  
  return {
    orderCountPoints,
    trendMomentumPoints,
    rankBonusPoints,
    momentumBonusPoints,
    consistencyBonusPoints,
    velocityBonusPoints,
    streakBonusPoints,
    marketShareBonusPoints,
    totalPoints,
    trendMultiplier,
    consistencyScore,
    velocityScore,
  };
}

/**
 * Calculate pharmacy score with new trend-based system
 * REBALANCED: Similar to manufacturers, target 50-120 pts
 */
export function calculatePharmacyTrendScore(stats: TrendScoringStats): TrendScoringBreakdown {
  // Base points from order count (reduced from 10 to 5)
  const orderCountPoints = stats.orderCount * 5;
  
  // Trend momentum points (reduced from 100 to 25)
  const trendMultiplier =
    typeof stats.trendMultiplier === 'number' && stats.trendMultiplier > 0
      ? Math.min(stats.trendMultiplier, 5.0) // Cap at 5x
      : calculateTrendMultiplier(stats.days1 ?? 0, stats.days7 ?? 0);
  const trendMomentumPoints = Math.floor(trendMultiplier * 25);
  
  // Rank-based bonuses (now unified)
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'pharmacy');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'pharmacy');
  
  // Advanced feature bonuses (capped)
  const consistencyScore =
    typeof stats.consistencyScore === 'number'
      ? stats.consistencyScore
      : calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.min(20, Math.floor(consistencyScore * 0.20));
  
  const velocityScore =
    typeof stats.velocityScore === 'number'
      ? stats.velocityScore
      : calculateVelocityScore(stats.days1 ?? 0, stats.days7 ?? 0, stats.days14);
  const velocityBonusPoints = Math.min(15, Math.abs(Math.floor(velocityScore * 0.15)));
  
  const streakBonusPoints = calculateStreakBonus(stats.streakDays); // Already capped at 15
  const marketShareBonusPoints = calculateMarketShareBonus(stats.marketSharePercent); // Already capped at 20
  
  // Calculate total (target: 50-120 pts base + up to 50 in bonuses)
  const totalPoints = 
    orderCountPoints +
    trendMomentumPoints +
    rankBonusPoints +
    momentumBonusPoints +
    consistencyBonusPoints +
    velocityBonusPoints +
    streakBonusPoints +
    marketShareBonusPoints;
  
  return {
    orderCountPoints,
    trendMomentumPoints,
    rankBonusPoints,
    momentumBonusPoints,
    consistencyBonusPoints,
    velocityBonusPoints,
    streakBonusPoints,
    marketShareBonusPoints,
    totalPoints,
    trendMultiplier,
    consistencyScore,
    velocityScore,
  };
}

/**
 * Export scoring rules for display purposes
 */
export const TREND_SCORING_RULES = {
  manufacturer: {
    orderCount: { formula: 'Order count × 5', points: '5 pts per order' },
    trendMomentum: { formula: '(Day 1 ÷ 7-day avg) × 25', points: 'Up to 125 pts' },
    rankBonus: { formula: 'Rank tiers', points: '+30 / +20 / +15 / +10' },
    momentumBonus: { formula: 'Rank improvement', points: '+8 pts per rank (capped 40)' },
    consistencyBonus: { formula: 'Low variance', points: 'Up to 20 pts' },
    velocityBonus: { formula: 'Acceleration', points: 'Up to 15 pts' },
    streakBonus: { formula: 'Consecutive top 10 days', points: '2 pts per day (max 15)' },
    marketShareBonus: { formula: 'Market position', points: 'Up to 20 pts' },
  },
  strain: {
    orderCount: { formula: 'Order count × 4.5', points: '4.5 pts per order' },
    trendMomentum: { formula: '(Day 1 ÷ 7-day avg) × 22', points: 'Up to 110 pts' },
    rankBonus: { formula: 'Rank tiers', points: '+30 / +20 / +15 / +10' },
    momentumBonus: { formula: 'Rank improvement', points: '+8 pts per rank (capped 40)' },
    consistencyBonus: { formula: 'Low variance', points: 'Up to 20 pts' },
    velocityBonus: { formula: 'Acceleration', points: 'Up to 15 pts' },
    streakBonus: { formula: 'Consecutive top 10 days', points: '2 pts per day (max 15)' },
    marketShareBonus: { formula: 'Market position', points: 'Up to 20 pts' },
  },
  product: {
    orderCount: { formula: 'Order count × 4', points: '4 pts per order' },
    trendMomentum: { formula: '(Day 1 ÷ 7-day avg) × 20', points: 'Up to 100 pts' },
    rankBonus: { formula: 'Rank tiers', points: '+30 / +20 / +15 / +10' },
    momentumBonus: { formula: 'Rank improvement', points: '+8 pts per rank (capped 40)' },
    consistencyBonus: { formula: 'Low variance', points: 'Up to 20 pts' },
    velocityBonus: { formula: 'Acceleration', points: 'Up to 15 pts' },
    streakBonus: { formula: 'Consecutive top 10 days', points: '2 pts per day (max 15)' },
    marketShareBonus: { formula: 'Market position', points: 'Up to 20 pts' },
  },
  pharmacy: {
    orderCount: { formula: 'Order count × 5', points: '5 pts per order' },
    trendMomentum: { formula: '(Day 1 ÷ 7-day avg) × 25', points: 'Up to 125 pts' },
    rankBonus: { formula: 'Rank tiers', points: '+30 / +20 / +15 / +10' },
    momentumBonus: { formula: 'Rank improvement', points: '+8 pts per rank (capped 40)' },
    consistencyBonus: { formula: 'Low variance', points: 'Up to 20 pts' },
    velocityBonus: { formula: 'Acceleration', points: 'Up to 15 pts' },
    streakBonus: { formula: 'Consecutive top 10 days', points: '2 pts per day (max 15)' },
    marketShareBonus: { formula: 'Market position', points: 'Up to 20 pts' },
  },
};
