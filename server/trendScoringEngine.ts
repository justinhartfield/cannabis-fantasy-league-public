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
  // as a hype multiplier so brand-new drops get rewarded.
  if (averageDailyVolume === 0) {
    return currentDayVolume > 0 ? 10.0 : 1.0;
  }

  const multiplier = currentDayVolume / averageDailyVolume;
  return Math.min(Math.max(multiplier, 0.1), 10.0); // Cap between 0.1x and 10x
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
 * Calculate streak bonus points (legacy function, kept for compatibility)
 */
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays < 2) return 0;
  
  // Progressive bonus based on multiplier
  const multiplier = calculateStreakMultiplier(streakDays);
  const bonusPercent = (multiplier - 1.0) * 100; // Convert to percentage
  
  // Return bonus points (scaled to reasonable values)
  return Math.floor(bonusPercent * 2); // 2-3 days = 20pts, 21+ days = 400pts
}

/**
 * Calculate market share bonus for gaining relative position
 */
export function calculateMarketShareBonus(marketSharePercent: number): number {
  // Award points for significant market share
  if (marketSharePercent >= 10) return 50; // Dominant player
  if (marketSharePercent >= 5) return 30; // Major player
  if (marketSharePercent >= 2) return 15; // Significant player
  if (marketSharePercent >= 1) return 5; // Notable player
  return 0;
}

/**
 * Calculate rank bonus based on current position (tiered)
 */
export function calculateRankBonus(rank: number, entityType: 'manufacturer' | 'strain' | 'product' | 'pharmacy'): number {
  if (rank === 0) return 0; // Unranked
  
  const bonusTiers = {
    manufacturer: { rank1: 50, rank2to5: 25, rank6to10: 10 },
    pharmacy: { rank1: 40, rank2to5: 20, rank6to10: 10 },
    product: { rank1: 35, rank2to5: 20, rank6to10: 10 },
    strain: { rank1: 30, rank2to5: 15, rank6to10: 5 },
  };
  
  const tier = bonusTiers[entityType];
  
  if (rank === 1) return tier.rank1;
  if (rank >= 2 && rank <= 5) return tier.rank2to5;
  if (rank >= 6 && rank <= 10) return tier.rank6to10;
  return 0;
}

/**
 * Calculate momentum bonus based on rank change
 */
export function calculateMomentumBonus(previousRank: number, currentRank: number, entityType: 'manufacturer' | 'strain' | 'product' | 'pharmacy'): number {
  if (previousRank === 0 || currentRank === 0) return 0; // No previous rank to compare
  
  const rankChange = previousRank - currentRank; // Positive = improvement
  
  const bonusPerRank = {
    manufacturer: { gain: 10, loss: -5 },
    pharmacy: { gain: 10, loss: -5 },
    product: { gain: 10, loss: -5 },
    strain: { gain: 8, loss: -4 },
  };
  
  const bonus = bonusPerRank[entityType];
  
  if (rankChange > 0) {
    return rankChange * bonus.gain;
  } else if (rankChange < 0) {
    return rankChange * Math.abs(bonus.loss);
  }
  return 0;
}

/**
 * Calculate manufacturer score with new trend-based system
 */
export function calculateManufacturerTrendScore(stats: TrendScoringStats): TrendScoringBreakdown {
  // Base points from order count
  const orderCountPoints = stats.orderCount * 10;
  
  // Trend momentum points
  const trendMultiplier =
    typeof stats.trendMultiplier === 'number' && stats.trendMultiplier > 0
      ? stats.trendMultiplier
      : calculateTrendMultiplier(stats.days1 ?? 0, stats.days7 ?? 0);
  const trendMomentumPoints = Math.floor(trendMultiplier * 100);
  
  // Rank-based bonuses
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'manufacturer');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'manufacturer');
  
  // Advanced feature bonuses
  const consistencyScore =
    typeof stats.consistencyScore === 'number'
      ? stats.consistencyScore
      : calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.floor(consistencyScore * 0.5); // Scale down to 50 max
  
  const velocityScore =
    typeof stats.velocityScore === 'number'
      ? stats.velocityScore
      : calculateVelocityScore(stats.days1 ?? 0, stats.days7 ?? 0, stats.days14);
  const velocityBonusPoints = velocityScore;
  
  const streakBonusPoints = calculateStreakBonus(stats.streakDays);
  const marketShareBonusPoints = calculateMarketShareBonus(stats.marketSharePercent);
  
  // Calculate total
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
 */
export function calculateStrainTrendScore(stats: TrendScoringStats): TrendScoringBreakdown {
  // Base points from order count (slightly lower multiplier)
  const orderCountPoints = stats.orderCount * 8;
  
  // Trend momentum points (lower multiplier than manufacturers)
  const trendMultiplier =
    typeof stats.trendMultiplier === 'number' && stats.trendMultiplier > 0
      ? stats.trendMultiplier
      : calculateTrendMultiplier(stats.days1 ?? 0, stats.days7 ?? 0);
  const trendMomentumPoints = Math.floor(trendMultiplier * 80);
  
  // Rank-based bonuses
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'strain');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'strain');
  
  // Advanced feature bonuses
  const consistencyScore =
    typeof stats.consistencyScore === 'number'
      ? stats.consistencyScore
      : calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.floor(consistencyScore * 0.4);
  
  const velocityScore =
    typeof stats.velocityScore === 'number'
      ? stats.velocityScore
      : calculateVelocityScore(stats.days1 ?? 0, stats.days7 ?? 0, stats.days14);
  const velocityBonusPoints = Math.floor(velocityScore * 0.8);
  
  const streakBonusPoints = Math.floor(calculateStreakBonus(stats.streakDays) * 0.8);
  const marketShareBonusPoints = Math.floor(calculateMarketShareBonus(stats.marketSharePercent) * 0.8);
  
  // Calculate total
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
 * Calculate product score with new trend-based system (3x multiplier)
 */
export function calculateProductTrendScore(stats: TrendScoringStats): TrendScoringBreakdown {
  // Base points from order count (3x multiplier)
  const orderCountPoints = stats.orderCount * 15;
  
  // Trend momentum points (3x multiplier)
  const trendMultiplier =
    typeof stats.trendMultiplier === 'number' && stats.trendMultiplier > 0
      ? stats.trendMultiplier
      : calculateTrendMultiplier(stats.days1 ?? 0, stats.days7 ?? 0);
  const trendMomentumPoints = Math.floor(trendMultiplier * 120);
  
  // Rank-based bonuses
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'product');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'product');
  
  // Advanced feature bonuses (scaled up for products)
  const consistencyScore =
    typeof stats.consistencyScore === 'number'
      ? stats.consistencyScore
      : calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.floor(consistencyScore * 0.6);
  
  const velocityScore =
    typeof stats.velocityScore === 'number'
      ? stats.velocityScore
      : calculateVelocityScore(stats.days1 ?? 0, stats.days7 ?? 0, stats.days14);
  const velocityBonusPoints = Math.floor(velocityScore * 1.2);
  
  const streakBonusPoints = Math.floor(calculateStreakBonus(stats.streakDays) * 1.2);
  const marketShareBonusPoints = Math.floor(calculateMarketShareBonus(stats.marketSharePercent) * 1.2);
  
  // Calculate total
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
 */
export function calculatePharmacyTrendScore(stats: TrendScoringStats): TrendScoringBreakdown {
  // Base points from order count
  const orderCountPoints = stats.orderCount * 10;
  
  // Trend momentum points
  const trendMultiplier =
    typeof stats.trendMultiplier === 'number' && stats.trendMultiplier > 0
      ? stats.trendMultiplier
      : calculateTrendMultiplier(stats.days1 ?? 0, stats.days7 ?? 0);
  const trendMomentumPoints = Math.floor(trendMultiplier * 100);
  
  // Rank-based bonuses
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'pharmacy');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'pharmacy');
  
  // Advanced feature bonuses
  const consistencyScore =
    typeof stats.consistencyScore === 'number'
      ? stats.consistencyScore
      : calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.floor(consistencyScore * 0.5);
  
  const velocityScore =
    typeof stats.velocityScore === 'number'
      ? stats.velocityScore
      : calculateVelocityScore(stats.days1 ?? 0, stats.days7 ?? 0, stats.days14);
  const velocityBonusPoints = velocityScore;
  
  const streakBonusPoints = calculateStreakBonus(stats.streakDays);
  const marketShareBonusPoints = calculateMarketShareBonus(stats.marketSharePercent);
  
  // Calculate total
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
    orderCount: { formula: 'Order count × 10', points: '10 pts per order' },
    trendMomentum: { formula: '(Day 1 ÷ 7-day avg) × 100', points: 'Up to 1,000 pts' },
    rankBonus: { formula: 'Rank #1', points: '+50 pts' },
    momentumBonus: { formula: 'Rank improvement', points: '+10 pts per rank' },
    consistencyBonus: { formula: 'Low variance', points: 'Up to 50 pts' },
    velocityBonus: { formula: 'Acceleration', points: 'Up to 100 pts' },
    streakBonus: { formula: 'Consecutive top 10 days', points: '+5 pts per day' },
    marketShareBonus: { formula: 'Market position', points: 'Up to 50 pts' },
  },
  strain: {
    orderCount: { formula: 'Order count × 8', points: '8 pts per order' },
    trendMomentum: { formula: '(Day 1 ÷ 7-day avg) × 80', points: 'Up to 800 pts' },
    rankBonus: { formula: 'Rank #1', points: '+30 pts' },
    momentumBonus: { formula: 'Rank improvement', points: '+8 pts per rank' },
  },
  product: {
    orderCount: { formula: 'Order count × 15', points: '15 pts per order' },
    trendMomentum: { formula: '(Day 1 ÷ 7-day avg) × 120', points: 'Up to 1,200 pts' },
    rankBonus: { formula: 'Rank #1', points: '+35 pts' },
    momentumBonus: { formula: 'Rank improvement', points: '+10 pts per rank' },
  },
  pharmacy: {
    orderCount: { formula: 'Order count × 10', points: '10 pts per order' },
    trendMomentum: { formula: '(Day 1 ÷ 7-day avg) × 100', points: 'Up to 1,000 pts' },
    rankBonus: { formula: 'Rank #1', points: '+40 pts' },
    momentumBonus: { formula: 'Rank improvement', points: '+10 pts per rank' },
  },
};
