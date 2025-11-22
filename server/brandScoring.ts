/**
 * Brand Scoring Formulas
 * 
 * Brands score based on marketing and engagement metrics:
 * - Favorites/likes
 * - Views/impressions
 * - Comments/engagement
 * - Affiliate link clicks
 * - Social buzz
 */

/**
 * Calculate brand fantasy points
 */
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function calculateBrandPoints(stats: {
  favorites: number;
  favoriteGrowth: number;
  views: number;
  viewGrowth: number;
  comments: number;
  commentGrowth: number;
  affiliateClicks: number;
  clickGrowth: number;
  engagementRate: number; // Percentage (0-100)
  sentimentScore: number; // Score from -100 to +100
}): { points: number; breakdown: any } {
  const breakdown: any = {
    components: [],
    subtotal: 0,
    bonuses: [],
    penalties: [],
    total: 0,
  };

  // Engagement footprint (favorites + views)
  const favoritesPoints = Math.min(30, Math.floor(stats.favorites / 200));
  breakdown.components.push({
    category: 'Fan Favorites',
    value: stats.favorites,
    formula: `${stats.favorites} ÷ 200`,
    points: favoritesPoints,
  });

  const viewsPoints = Math.min(20, Math.floor(stats.views / 2000));
  breakdown.components.push({
    category: 'Reach',
    value: stats.views,
    formula: `${stats.views} ÷ 2000`,
    points: viewsPoints,
  });

  // Conversation + advocacy
  const commentsPoints = Math.min(15, stats.comments * 2);
  breakdown.components.push({
    category: 'Conversations',
    value: stats.comments,
    formula: `${stats.comments} × 2 (capped 15)`,
    points: commentsPoints,
  });

  const affiliatePoints = Math.min(15, Math.floor(stats.affiliateClicks * 0.5));
  breakdown.components.push({
    category: 'Affiliate Demand',
    value: stats.affiliateClicks,
    formula: `${stats.affiliateClicks} × 0.5 (capped 15)`,
    points: affiliatePoints,
  });

  // Momentum (growth signals)
  const momentumPoints = Math.min(
    20,
    Math.max(0, Math.floor(stats.favoriteGrowth / 20)) +
      Math.max(0, Math.floor(stats.viewGrowth / 1000)) +
      Math.max(0, stats.commentGrowth * 2) +
      Math.max(0, Math.floor(stats.clickGrowth))
  );
  if (momentumPoints > 0) {
    breakdown.components.push({
      category: 'Momentum',
      value: stats.favoriteGrowth,
      formula: 'Growth metrics scaled & capped at 20',
      points: momentumPoints,
    });
  }

  breakdown.subtotal =
    favoritesPoints + viewsPoints + commentsPoints + affiliatePoints + momentumPoints;

  // Bonuses
  if (stats.engagementRate >= 12) {
    breakdown.bonuses.push({
      type: 'High Engagement',
      condition: `${stats.engagementRate}% engagement`,
      points: 15,
    });
    breakdown.subtotal += 15;
  } else if (stats.engagementRate >= 8) {
    breakdown.bonuses.push({
      type: 'Solid Engagement',
      condition: `${stats.engagementRate}% engagement`,
      points: 10,
    });
    breakdown.subtotal += 10;
  }

  const sentimentAdjustment = clamp(Math.floor(stats.sentimentScore / 10), -10, 15);
  if (sentimentAdjustment !== 0) {
    const targetArray = sentimentAdjustment > 0 ? breakdown.bonuses : breakdown.penalties;
    targetArray.push({
      type: sentimentAdjustment > 0 ? 'Positive Sentiment' : 'Negative Sentiment',
      condition: `Score: ${stats.sentimentScore}`,
      points: sentimentAdjustment,
    });
    breakdown.subtotal += sentimentAdjustment;
  }

  // Declining interest penalty
  if (stats.favoriteGrowth < -50) {
    breakdown.penalties.push({
      type: 'Declining Interest',
      condition: `${stats.favoriteGrowth} favorites lost`,
      points: -10,
    });
    breakdown.subtotal -= 10;
  }

  breakdown.total = Math.max(0, breakdown.subtotal);

  return {
    points: breakdown.total,
    breakdown,
  };
}
