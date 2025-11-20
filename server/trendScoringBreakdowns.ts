/**
 * Trend-Based Scoring Breakdown Builders
 * 
 * Formats trend-based scoring data for API responses and frontend display.
 * Replaces explicit sales metrics with relative performance indicators.
 */

import { TrendScoringBreakdown } from './trendScoringEngine';

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

/**
 * Build manufacturer trend-based breakdown for display
 */
export function buildManufacturerTrendBreakdown(
  scoring: TrendScoringBreakdown,
  orderCount: number,
  rank: number,
  previousRank: number,
  streakDays: number
): BreakdownResult {
  const components: BreakdownComponent[] = [
    {
      category: 'Order Activity',
      value: `${orderCount} orders`,
      formula: `${orderCount} × 10`,
      points: scoring.orderCountPoints,
    },
    {
      category: 'Trend Bonus',
      value: `${scoring.trendMultiplier.toFixed(2)}x`,
      formula: `${scoring.trendMultiplier.toFixed(2)} × 20`,
      points: scoring.trendMomentumPoints,
    },
  ];

  const bonuses: BreakdownBonus[] = [];
  const penalties: BreakdownBonus[] = [];

  // Rank bonus
  if (scoring.rankBonusPoints > 0) {
    bonuses.push({
      type: 'Rank Bonus',
      condition: `Rank #${rank}`,
      points: scoring.rankBonusPoints,
    });
  }

  // Momentum bonus (rank change)
  if (scoring.momentumBonusPoints !== 0) {
    const rankChange = previousRank - rank;
    const arrow = rankChange > 0 ? '↑' : rankChange < 0 ? '↓' : '→';
    if (scoring.momentumBonusPoints > 0) {
      bonuses.push({
        type: 'Position Gain',
        condition: `${arrow}${Math.abs(rankChange)} ranks`,
        points: scoring.momentumBonusPoints,
      });
    } else {
      penalties.push({
        type: 'Position Loss',
        condition: `${arrow}${Math.abs(rankChange)} ranks`,
        points: scoring.momentumBonusPoints,
      });
    }
  }

  // Consistency bonus
  if (scoring.consistencyBonusPoints > 0) {
    bonuses.push({
      type: 'Consistency Bonus',
      condition: `Stable performance (${scoring.consistencyScore}/100)`,
      points: scoring.consistencyBonusPoints,
    });
  }

  // Velocity bonus
  if (scoring.velocityBonusPoints !== 0) {
    if (scoring.velocityBonusPoints > 0) {
      bonuses.push({
        type: 'Velocity Bonus',
        condition: `Accelerating growth (+${scoring.velocityScore})`,
        points: scoring.velocityBonusPoints,
      });
    } else {
      penalties.push({
        type: 'Velocity Penalty',
        condition: `Decelerating growth (${scoring.velocityScore})`,
        points: scoring.velocityBonusPoints,
      });
    }
  }

  // Streak bonus with progressive tier display
  if (scoring.streakBonusPoints > 0) {
    const { getStreakTierName, calculateStreakMultiplier } = require('./trendScoringEngine');
    const tierName = getStreakTierName(streakDays);
    const multiplier = calculateStreakMultiplier(streakDays);
    bonuses.push({
      type: `${tierName} Streak`,
      condition: `${streakDays} days streak (×${multiplier.toFixed(2)} multiplier)`,
      points: scoring.streakBonusPoints,
    });
  }

  // Market share bonus
  if (scoring.marketShareBonusPoints > 0) {
    bonuses.push({
      type: 'Market Share Bonus',
      condition: 'Significant market position',
      points: scoring.marketShareBonusPoints,
    });
  }

  const subtotal = components.reduce((sum, c) => sum + c.points, 0);
  const total = scoring.totalPoints;

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

/**
 * Build strain trend-based breakdown for display
 */
export function buildStrainTrendBreakdown(
  scoring: TrendScoringBreakdown,
  orderCount: number,
  rank: number,
  previousRank: number,
  streakDays: number
): BreakdownResult {
  const components: BreakdownComponent[] = [
    {
      category: 'Order Activity',
      value: `${orderCount} orders`,
      formula: `${orderCount} × 8`,
      points: scoring.orderCountPoints,
    },
    {
      category: 'Trend Bonus',
      value: `${scoring.trendMultiplier.toFixed(2)}x`,
      formula: `${scoring.trendMultiplier.toFixed(2)} × 15`,
      points: scoring.trendMomentumPoints,
    },
  ];

  const bonuses: BreakdownBonus[] = [];
  const penalties: BreakdownBonus[] = [];

  if (scoring.rankBonusPoints > 0) {
    bonuses.push({
      type: 'Rank Bonus',
      condition: `Rank #${rank}`,
      points: scoring.rankBonusPoints,
    });
  }

  if (scoring.momentumBonusPoints !== 0) {
    const rankChange = previousRank - rank;
    const arrow = rankChange > 0 ? '↑' : rankChange < 0 ? '↓' : '→';
    if (scoring.momentumBonusPoints > 0) {
      bonuses.push({
        type: 'Position Gain',
        condition: `${arrow}${Math.abs(rankChange)} ranks`,
        points: scoring.momentumBonusPoints,
      });
    } else {
      penalties.push({
        type: 'Position Loss',
        condition: `${arrow}${Math.abs(rankChange)} ranks`,
        points: scoring.momentumBonusPoints,
      });
    }
  }

  if (scoring.consistencyBonusPoints > 0) {
    bonuses.push({
      type: 'Consistency Bonus',
      condition: `Stable performance (${scoring.consistencyScore}/100)`,
      points: scoring.consistencyBonusPoints,
    });
  }

  if (scoring.velocityBonusPoints !== 0) {
    if (scoring.velocityBonusPoints > 0) {
      bonuses.push({
        type: 'Velocity Bonus',
        condition: `Accelerating growth`,
        points: scoring.velocityBonusPoints,
      });
    } else {
      penalties.push({
        type: 'Velocity Penalty',
        condition: `Decelerating growth`,
        points: scoring.velocityBonusPoints,
      });
    }
  }

  if (scoring.streakBonusPoints > 0) {
    const { getStreakTierName, calculateStreakMultiplier } = require('./trendScoringEngine');
    const tierName = getStreakTierName(streakDays);
    const multiplier = calculateStreakMultiplier(streakDays);
    bonuses.push({
      type: `${tierName} Streak`,
      condition: `${streakDays} days streak (×${multiplier.toFixed(2)} multiplier)`,
      points: scoring.streakBonusPoints,
    });
  }

  if (scoring.marketShareBonusPoints > 0) {
    bonuses.push({
      type: 'Market Share Bonus',
      condition: 'Significant market position',
      points: scoring.marketShareBonusPoints,
    });
  }

  const subtotal = components.reduce((sum, c) => sum + c.points, 0);
  let bonusesTotal = bonuses.reduce((sum, c) => sum + c.points, 0);
  const penaltiesTotal = penalties.reduce((sum, c) => sum + c.points, 0);
  
  // Check for consistency bonus mismatch
  if (scoring.consistencyBonusPoints > 0 && !bonuses.find(b => b.type === 'Consistency Bonus')) {
    bonuses.push({
      type: 'Consistency Bonus',
      condition: `Stable performance (${scoring.consistencyScore}/100)`,
      points: scoring.consistencyBonusPoints,
    });
    bonusesTotal += scoring.consistencyBonusPoints;
  }

  const total = scoring.totalPoints;
  const computedSum = subtotal + bonusesTotal + penaltiesTotal;

  if (Math.abs(total - computedSum) > 0.5) {
    const diff = total - computedSum;
    if (diff > 0) {
       bonuses.push({
         type: 'Adjustment',
         condition: 'Score reconciliation',
         points: Math.round(diff)
       });
    } else {
       // For negative adjustment, we add to penalties
       // But penalties points should be negative to subtract from sum?
       // In this file's logic: subtotal + bonuses + penalties.
       // If we want to reduce sum, we need negative points.
       penalties.push({
         type: 'Adjustment',
         condition: 'Score reconciliation',
         points: Math.round(diff) 
       });
    }
  }

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

/**
 * Build product trend-based breakdown for display
 */
export function buildProductTrendBreakdown(
  scoring: TrendScoringBreakdown,
  orderCount: number,
  rank: number,
  previousRank: number,
  streakDays: number
): BreakdownResult {
  const components: BreakdownComponent[] = [
    {
      category: 'Order Activity',
      value: `${orderCount} orders`,
      formula: `${orderCount} × 15`,
      points: scoring.orderCountPoints,
    },
    {
      category: 'Trend Bonus',
      value: `${scoring.trendMultiplier.toFixed(2)}x`,
      formula: `${scoring.trendMultiplier.toFixed(2)} × 25`,
      points: scoring.trendMomentumPoints,
    },
  ];

  const bonuses: BreakdownBonus[] = [];
  const penalties: BreakdownBonus[] = [];

  if (scoring.rankBonusPoints > 0) {
    bonuses.push({
      type: 'Rank Bonus',
      condition: `Rank #${rank}`,
      points: scoring.rankBonusPoints,
    });
  }

  if (scoring.momentumBonusPoints !== 0) {
    const rankChange = previousRank - rank;
    const arrow = rankChange > 0 ? '↑' : rankChange < 0 ? '↓' : '→';
    if (scoring.momentumBonusPoints > 0) {
      bonuses.push({
        type: 'Position Gain',
        condition: `${arrow}${Math.abs(rankChange)} ranks`,
        points: scoring.momentumBonusPoints,
      });
    } else {
      penalties.push({
        type: 'Position Loss',
        condition: `${arrow}${Math.abs(rankChange)} ranks`,
        points: scoring.momentumBonusPoints,
      });
    }
  }

  if (scoring.consistencyBonusPoints > 0) {
    bonuses.push({
      type: 'Consistency Bonus',
      condition: `Stable performance (${scoring.consistencyScore}/100)`,
      points: scoring.consistencyBonusPoints,
    });
  }

  if (scoring.velocityBonusPoints !== 0) {
    if (scoring.velocityBonusPoints > 0) {
      bonuses.push({
        type: 'Velocity Bonus',
        condition: `Accelerating growth`,
        points: scoring.velocityBonusPoints,
      });
    } else {
      penalties.push({
        type: 'Velocity Penalty',
        condition: `Decelerating growth`,
        points: scoring.velocityBonusPoints,
      });
    }
  }

  if (scoring.streakBonusPoints > 0) {
    const { getStreakTierName, calculateStreakMultiplier } = require('./trendScoringEngine');
    const tierName = getStreakTierName(streakDays);
    const multiplier = calculateStreakMultiplier(streakDays);
    bonuses.push({
      type: `${tierName} Streak`,
      condition: `${streakDays} days streak (×${multiplier.toFixed(2)} multiplier)`,
      points: scoring.streakBonusPoints,
    });
  }

  if (scoring.marketShareBonusPoints > 0) {
    bonuses.push({
      type: 'Market Share Bonus',
      condition: 'Significant market position',
      points: scoring.marketShareBonusPoints,
    });
  }

  const subtotal = components.reduce((sum, c) => sum + c.points, 0);
  const total = scoring.totalPoints;

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

/**
 * Build pharmacy trend-based breakdown for display
 */
export function buildPharmacyTrendBreakdown(
  scoring: TrendScoringBreakdown,
  orderCount: number,
  rank: number,
  previousRank: number,
  streakDays: number
): BreakdownResult {
  const components: BreakdownComponent[] = [
    {
      category: 'Order Activity',
      value: `${orderCount} orders`,
      formula: `${orderCount} × 10`,
      points: scoring.orderCountPoints,
    },
    {
      category: 'Trend Bonus',
      value: `${scoring.trendMultiplier.toFixed(2)}x`,
      formula: `${scoring.trendMultiplier.toFixed(2)} × 20`,
      points: scoring.trendMomentumPoints,
    },
  ];

  const bonuses: BreakdownBonus[] = [];
  const penalties: BreakdownBonus[] = [];

  if (scoring.rankBonusPoints > 0) {
    bonuses.push({
      type: 'Rank Bonus',
      condition: `Rank #${rank}`,
      points: scoring.rankBonusPoints,
    });
  }

  if (scoring.momentumBonusPoints !== 0) {
    const rankChange = previousRank - rank;
    const arrow = rankChange > 0 ? '↑' : rankChange < 0 ? '↓' : '→';
    if (scoring.momentumBonusPoints > 0) {
      bonuses.push({
        type: 'Position Gain',
        condition: `${arrow}${Math.abs(rankChange)} ranks`,
        points: scoring.momentumBonusPoints,
      });
    } else {
      penalties.push({
        type: 'Position Loss',
        condition: `${arrow}${Math.abs(rankChange)} ranks`,
        points: scoring.momentumBonusPoints,
      });
    }
  }

  if (scoring.consistencyBonusPoints > 0) {
    bonuses.push({
      type: 'Consistency Bonus',
      condition: `Stable performance (${scoring.consistencyScore}/100)`,
      points: scoring.consistencyBonusPoints,
    });
  }

  if (scoring.velocityBonusPoints !== 0) {
    if (scoring.velocityBonusPoints > 0) {
      bonuses.push({
        type: 'Velocity Bonus',
        condition: `Accelerating growth`,
        points: scoring.velocityBonusPoints,
      });
    } else {
      penalties.push({
        type: 'Velocity Penalty',
        condition: `Decelerating growth`,
        points: scoring.velocityBonusPoints,
      });
    }
  }

  if (scoring.streakBonusPoints > 0) {
    const { getStreakTierName, calculateStreakMultiplier } = require('./trendScoringEngine');
    const tierName = getStreakTierName(streakDays);
    const multiplier = calculateStreakMultiplier(streakDays);
    bonuses.push({
      type: `${tierName} Streak`,
      condition: `${streakDays} days streak (×${multiplier.toFixed(2)} multiplier)`,
      points: scoring.streakBonusPoints,
    });
  }

  if (scoring.marketShareBonusPoints > 0) {
    bonuses.push({
      type: 'Market Share Bonus',
      condition: 'Significant market position',
      points: scoring.marketShareBonusPoints,
    });
  }

  const subtotal = components.reduce((sum, c) => sum + c.points, 0);
  const total = scoring.totalPoints;

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

/**
 * Format trend multiplier for display
 */
export function formatTrendMultiplier(multiplier: number): string {
  if (multiplier >= 5) return `${multiplier.toFixed(1)}x 🔥`;
  if (multiplier >= 2) return `${multiplier.toFixed(1)}x ↗️`;
  if (multiplier >= 1) return `${multiplier.toFixed(1)}x →`;
  return `${multiplier.toFixed(1)}x ↘️`;
}

/**
 * Format rank change for display
 */
export function formatRankChange(previousRank: number, currentRank: number): string {
  if (previousRank === 0) return `#${currentRank} (new)`;
  
  const change = previousRank - currentRank;
  if (change > 0) return `#${currentRank} (↑${change})`;
  if (change < 0) return `#${currentRank} (↓${Math.abs(change)})`;
  return `#${currentRank} (→)`;
}

/**
 * Format streak for display
 */
export function formatStreak(streakDays: number): string {
  if (streakDays === 0) return '';
  if (streakDays === 1) return '🔥';
  if (streakDays < 7) return `🔥 ${streakDays}d`;
  return `🔥🔥 ${streakDays}d`;
}
