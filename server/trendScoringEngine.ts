/**
 * Trend-Based Scoring Engine
 * 
 * Implements the new scoring system that uses relative trends instead of explicit sales metrics.
 * Includes: Trend Momentum, Consistency Score, Velocity Score, Streak Bonus, and Market Share Trend.
 */

export interface TrendScoringStats {
  orderCount: number;
  days1: number;
  days7: number;
  days14?: number;
  days30?: number;
  previousRank: number;
  currentRank: number;
  streakDays: number;
  marketSharePercent: number;
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
  // Handle division by zero
  if (days1 === 0) {
    if (days7 === 0) return 1.0; // Both zero = neutral
    return 10.0; // New entity with sales = max multiplier
  }
  
  // Calculate ratio and cap at reasonable bounds
  const multiplier = days7 / days1;
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
 * Calculate streak bonus for consecutive days in top 10
 */
export function calculateStreakBonus(streakDays: number): number {
  if (streakDays < 2) return 0;
  
  // +5 pts per day in streak, with exponential bonus for long streaks
  const baseBonus = streakDays * 5;
  const exponentialBonus = streakDays >= 7 ? Math.floor(Math.pow(streakDays - 6, 1.5)) * 5 : 0;
  
  return baseBonus + exponentialBonus;
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
  const trendMultiplier = calculateTrendMultiplier(stats.days1, stats.days7);
  const trendMomentumPoints = Math.floor(trendMultiplier * 20);
  
  // Rank-based bonuses
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'manufacturer');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'manufacturer');
  
  // Advanced feature bonuses
  const consistencyScore = calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.floor(consistencyScore * 0.5); // Scale down to 50 max
  
  const velocityScore = calculateVelocityScore(stats.days1, stats.days7, stats.days14);
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
  const trendMultiplier = calculateTrendMultiplier(stats.days1, stats.days7);
  const trendMomentumPoints = Math.floor(trendMultiplier * 15);
  
  // Rank-based bonuses
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'strain');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'strain');
  
  // Advanced feature bonuses
  const consistencyScore = calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.floor(consistencyScore * 0.4);
  
  const velocityScore = calculateVelocityScore(stats.days1, stats.days7, stats.days14);
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
  const trendMultiplier = calculateTrendMultiplier(stats.days1, stats.days7);
  const trendMomentumPoints = Math.floor(trendMultiplier * 25);
  
  // Rank-based bonuses
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'product');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'product');
  
  // Advanced feature bonuses (scaled up for products)
  const consistencyScore = calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.floor(consistencyScore * 0.6);
  
  const velocityScore = calculateVelocityScore(stats.days1, stats.days7, stats.days14);
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
  const trendMultiplier = calculateTrendMultiplier(stats.days1, stats.days7);
  const trendMomentumPoints = Math.floor(trendMultiplier * 20);
  
  // Rank-based bonuses
  const rankBonusPoints = calculateRankBonus(stats.currentRank, 'pharmacy');
  const momentumBonusPoints = calculateMomentumBonus(stats.previousRank, stats.currentRank, 'pharmacy');
  
  // Advanced feature bonuses
  const consistencyScore = calculateConsistencyScore(stats.dailyVolumes || []);
  const consistencyBonusPoints = Math.floor(consistencyScore * 0.5);
  
  const velocityScore = calculateVelocityScore(stats.days1, stats.days7, stats.days14);
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
    trendMomentum: { formula: '(Days7 ÷ Days1) × 20', points: 'Up to 200 pts' },
    rankBonus: { formula: 'Rank #1', points: '+50 pts' },
    momentumBonus: { formula: 'Rank improvement', points: '+10 pts per rank' },
    consistencyBonus: { formula: 'Low variance', points: 'Up to 50 pts' },
    velocityBonus: { formula: 'Acceleration', points: 'Up to 100 pts' },
    streakBonus: { formula: 'Consecutive top 10 days', points: '+5 pts per day' },
    marketShareBonus: { formula: 'Market position', points: 'Up to 50 pts' },
  },
  strain: {
    orderCount: { formula: 'Order count × 8', points: '8 pts per order' },
    trendMomentum: { formula: '(Days7 ÷ Days1) × 15', points: 'Up to 150 pts' },
    rankBonus: { formula: 'Rank #1', points: '+30 pts' },
    momentumBonus: { formula: 'Rank improvement', points: '+8 pts per rank' },
  },
  product: {
    orderCount: { formula: 'Order count × 15', points: '15 pts per order' },
    trendMomentum: { formula: '(Days7 ÷ Days1) × 25', points: 'Up to 250 pts' },
    rankBonus: { formula: 'Rank #1', points: '+35 pts' },
    momentumBonus: { formula: 'Rank improvement', points: '+10 pts per rank' },
  },
  pharmacy: {
    orderCount: { formula: 'Order count × 10', points: '10 pts per order' },
    trendMomentum: { formula: '(Days7 ÷ Days1) × 20', points: 'Up to 200 pts' },
    rankBonus: { formula: 'Rank #1', points: '+40 pts' },
    momentumBonus: { formula: 'Rank improvement', points: '+10 pts per rank' },
  },
};
