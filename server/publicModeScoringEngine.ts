/**
 * Public Mode Scoring Engine
 * 
 * Scoring Algorithm:
 * 
 * Base Points (0-100):
 * - Orders Score (40 pts max): (entity_orders / max_entity_orders) * 40
 * - Trend Score (30 pts max): WoW growth percentage normalized (from Manufacturer Report)
 * - User Engagement (30 pts max): Unique user count normalized
 * 
 * Bonus Multipliers:
 * - Viral Bonus (+25%): >50% WoW order growth
 * - Community Favorite (+15%): Top 3 in category by user count
 * - Co-Purchase Bonus (+10%): High pairing frequency from Product Recommendation
 * - Streak Bonus (+10%): 3+ consecutive days trending up
 */

export type EntityType = 'legendary' | 'trending' | 'effect' | 'consumption' | 'terpene';

export interface ScoringInput {
  entityType: EntityType;
  entityId: number;
  entityName: string;
  ordersCount: number;
  maxOrdersInCategory: number;
  weekOverWeekGrowth: number; // Percentage
  uniqueUsers: number;
  maxUsersInCategory: number;
  coPurchaseCount: number;
  maxCoPurchaseInCategory: number;
  streakDays: number;
  categoryRank: number; // 1-indexed rank
  totalInCategory: number;
}

export interface ScoringOutput {
  entityType: EntityType;
  entityId: number;
  entityName: string;
  // Base scores
  ordersScore: number; // 0-40
  trendScore: number; // 0-30
  userEngagementScore: number; // 0-30
  basePoints: number; // Sum of above (0-100)
  // Bonuses
  viralBonus: boolean; // +25%
  communityFavoriteBonus: boolean; // +15%
  coPurchaseBonus: boolean; // +10%
  streakBonus: boolean; // +10%
  bonusMultiplier: number; // Total bonus percentage (0-60)
  // Final score
  totalPoints: number; // Base points * (1 + bonusMultiplier/100)
  breakdown: {
    ordersScore: string;
    trendScore: string;
    userEngagementScore: string;
    bonuses: string[];
  };
}

/**
 * Calculate orders score (0-40 points)
 * Linear scaling based on max orders in category
 */
function calculateOrdersScore(ordersCount: number, maxOrdersInCategory: number): number {
  if (maxOrdersInCategory === 0) return 0;
  const score = (ordersCount / maxOrdersInCategory) * 40;
  return Math.min(40, Math.max(0, score));
}

/**
 * Calculate trend score (0-30 points)
 * Based on week-over-week growth percentage
 * 
 * Scoring:
 * - 0% growth = 15 points (baseline)
 * - >0% growth = 15 + (growth% / 10) up to 30 points
 * - <0% decline = 15 - (decline% / 10) down to 0 points
 */
function calculateTrendScore(weekOverWeekGrowth: number): number {
  const baseline = 15;
  const growthFactor = weekOverWeekGrowth / 10;
  const score = baseline + growthFactor;
  return Math.min(30, Math.max(0, score));
}

/**
 * Calculate user engagement score (0-30 points)
 * Linear scaling based on max users in category
 */
function calculateUserEngagementScore(uniqueUsers: number, maxUsersInCategory: number): number {
  if (maxUsersInCategory === 0) return 0;
  const score = (uniqueUsers / maxUsersInCategory) * 30;
  return Math.min(30, Math.max(0, score));
}

/**
 * Check if entity qualifies for Viral Bonus (+25%)
 * Criteria: >50% WoW order growth
 */
function hasViralBonus(weekOverWeekGrowth: number): boolean {
  return weekOverWeekGrowth > 50;
}

/**
 * Check if entity qualifies for Community Favorite Bonus (+15%)
 * Criteria: Top 3 in category by user count
 */
function hasCommunityFavoriteBonus(categoryRank: number): boolean {
  return categoryRank <= 3;
}

/**
 * Check if entity qualifies for Co-Purchase Bonus (+10%)
 * Criteria: High pairing frequency (top 25% in category)
 */
function hasCoPurchaseBonus(
  coPurchaseCount: number,
  maxCoPurchaseInCategory: number
): boolean {
  if (maxCoPurchaseInCategory === 0) return false;
  const percentile = coPurchaseCount / maxCoPurchaseInCategory;
  return percentile >= 0.75; // Top 25%
}

/**
 * Check if entity qualifies for Streak Bonus (+10%)
 * Criteria: 3+ consecutive days trending up
 */
function hasStreakBonus(streakDays: number): boolean {
  return streakDays >= 3;
}

/**
 * Calculate total bonus multiplier
 */
function calculateBonusMultiplier(
  viralBonus: boolean,
  communityFavoriteBonus: boolean,
  coPurchaseBonus: boolean,
  streakBonus: boolean
): number {
  let multiplier = 0;
  if (viralBonus) multiplier += 25;
  if (communityFavoriteBonus) multiplier += 15;
  if (coPurchaseBonus) multiplier += 10;
  if (streakBonus) multiplier += 10;
  return multiplier;
}

/**
 * Main scoring function
 */
export function calculateScore(input: ScoringInput): ScoringOutput {
  // Calculate base scores
  const ordersScore = calculateOrdersScore(input.ordersCount, input.maxOrdersInCategory);
  const trendScore = calculateTrendScore(input.weekOverWeekGrowth);
  const userEngagementScore = calculateUserEngagementScore(
    input.uniqueUsers,
    input.maxUsersInCategory
  );
  const basePoints = ordersScore + trendScore + userEngagementScore;

  // Check bonuses
  const viralBonus = hasViralBonus(input.weekOverWeekGrowth);
  const communityFavoriteBonus = hasCommunityFavoriteBonus(input.categoryRank);
  const coPurchaseBonus = hasCoPurchaseBonus(
    input.coPurchaseCount,
    input.maxCoPurchaseInCategory
  );
  const streakBonus = hasStreakBonus(input.streakDays);

  // Calculate bonus multiplier
  const bonusMultiplier = calculateBonusMultiplier(
    viralBonus,
    communityFavoriteBonus,
    coPurchaseBonus,
    streakBonus
  );

  // Calculate final score
  const totalPoints = Math.round(basePoints * (1 + bonusMultiplier / 100));

  // Create breakdown
  const bonuses: string[] = [];
  if (viralBonus) bonuses.push('Viral (+25%)');
  if (communityFavoriteBonus) bonuses.push('Community Favorite (+15%)');
  if (coPurchaseBonus) bonuses.push('Co-Purchase (+10%)');
  if (streakBonus) bonuses.push('Streak (+10%)');

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    ordersScore: Math.round(ordersScore * 10) / 10,
    trendScore: Math.round(trendScore * 10) / 10,
    userEngagementScore: Math.round(userEngagementScore * 10) / 10,
    basePoints: Math.round(basePoints * 10) / 10,
    viralBonus,
    communityFavoriteBonus,
    coPurchaseBonus,
    streakBonus,
    bonusMultiplier,
    totalPoints,
    breakdown: {
      ordersScore: `${Math.round(ordersScore * 10) / 10}/40 (${input.ordersCount} orders)`,
      trendScore: `${Math.round(trendScore * 10) / 10}/30 (${input.weekOverWeekGrowth}% WoW)`,
      userEngagementScore: `${Math.round(userEngagementScore * 10) / 10}/30 (${input.uniqueUsers} users)`,
      bonuses,
    },
  };
}

/**
 * Calculate scores for multiple entities in a category
 */
export function calculateCategoryScores(inputs: ScoringInput[]): ScoringOutput[] {
  return inputs.map(input => calculateScore(input));
}

/**
 * Position-specific scoring adjustments
 * Each position may have different weighting or bonus criteria
 */
export const POSITION_WEIGHTS = {
  legendary: {
    ordersWeight: 1.0,
    trendWeight: 0.8, // Legendary strains are more stable, less trend-focused
    engagementWeight: 1.2, // More emphasis on user engagement
  },
  trending: {
    ordersWeight: 0.8,
    trendWeight: 1.5, // Trending strains are all about momentum
    engagementWeight: 1.0,
  },
  effect: {
    ordersWeight: 1.0,
    trendWeight: 1.0,
    engagementWeight: 1.0, // Balanced scoring
  },
  consumption: {
    ordersWeight: 1.2, // Consumption types are volume-driven
    trendWeight: 0.8,
    engagementWeight: 1.0,
  },
  terpene: {
    ordersWeight: 0.9,
    trendWeight: 1.1,
    engagementWeight: 1.2, // Terpenes are for knowledgeable users
  },
};

/**
 * Calculate score with position-specific weights
 */
export function calculatePositionScore(
  input: ScoringInput,
  positionWeights?: typeof POSITION_WEIGHTS.legendary
): ScoringOutput {
  const weights = positionWeights || POSITION_WEIGHTS[input.entityType];

  // Calculate base scores with weights
  const ordersScore = calculateOrdersScore(input.ordersCount, input.maxOrdersInCategory) * weights.ordersWeight;
  const trendScore = calculateTrendScore(input.weekOverWeekGrowth) * weights.trendWeight;
  const userEngagementScore = calculateUserEngagementScore(
    input.uniqueUsers,
    input.maxUsersInCategory
  ) * weights.engagementWeight;

  // Normalize to 100 points
  const totalWeight = weights.ordersWeight + weights.trendWeight + weights.engagementWeight;
  const normalizedOrdersScore = (ordersScore / totalWeight) * (40 / 100);
  const normalizedTrendScore = (trendScore / totalWeight) * (30 / 100);
  const normalizedEngagementScore = (userEngagementScore / totalWeight) * (30 / 100);

  const basePoints = (normalizedOrdersScore * 100) + (normalizedTrendScore * 100) + (normalizedEngagementScore * 100);

  // Check bonuses (same as standard scoring)
  const viralBonus = hasViralBonus(input.weekOverWeekGrowth);
  const communityFavoriteBonus = hasCommunityFavoriteBonus(input.categoryRank);
  const coPurchaseBonus = hasCoPurchaseBonus(
    input.coPurchaseCount,
    input.maxCoPurchaseInCategory
  );
  const streakBonus = hasStreakBonus(input.streakDays);

  const bonusMultiplier = calculateBonusMultiplier(
    viralBonus,
    communityFavoriteBonus,
    coPurchaseBonus,
    streakBonus
  );

  const totalPoints = Math.round(basePoints * (1 + bonusMultiplier / 100));

  const bonuses: string[] = [];
  if (viralBonus) bonuses.push('Viral (+25%)');
  if (communityFavoriteBonus) bonuses.push('Community Favorite (+15%)');
  if (coPurchaseBonus) bonuses.push('Co-Purchase (+10%)');
  if (streakBonus) bonuses.push('Streak (+10%)');

  return {
    entityType: input.entityType,
    entityId: input.entityId,
    entityName: input.entityName,
    ordersScore: Math.round(normalizedOrdersScore * 1000) / 10,
    trendScore: Math.round(normalizedTrendScore * 1000) / 10,
    userEngagementScore: Math.round(normalizedEngagementScore * 1000) / 10,
    basePoints: Math.round(basePoints * 10) / 10,
    viralBonus,
    communityFavoriteBonus,
    coPurchaseBonus,
    streakBonus,
    bonusMultiplier,
    totalPoints,
    breakdown: {
      ordersScore: `${Math.round(normalizedOrdersScore * 1000) / 10}/40 (${input.ordersCount} orders)`,
      trendScore: `${Math.round(normalizedTrendScore * 1000) / 10}/30 (${input.weekOverWeekGrowth}% WoW)`,
      userEngagementScore: `${Math.round(normalizedEngagementScore * 1000) / 10}/30 (${input.uniqueUsers} users)`,
      bonuses,
    },
  };
}

/**
 * Calculate lineup total score
 */
export function calculateLineupScore(scores: ScoringOutput[]): number {
  return scores.reduce((total, score) => total + score.totalPoints, 0);
}
