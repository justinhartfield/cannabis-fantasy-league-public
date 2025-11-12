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

  // 1. Favorites: 1 pt per 50 favorites
  const favoritesPoints = Math.floor(stats.favorites / 50);
  breakdown.components.push({
    category: 'Favorites',
    value: stats.favorites,
    formula: `${stats.favorites} ÷ 50`,
    points: favoritesPoints,
  });

  // 2. Favorite Growth: 3 pts per 10 new favorites
  const favoriteGrowthPoints = Math.floor((stats.favoriteGrowth / 10) * 3);
  if (stats.favoriteGrowth > 0) {
    breakdown.components.push({
      category: 'Favorite Growth',
      value: stats.favoriteGrowth,
      formula: `${stats.favoriteGrowth} ÷ 10 × 3`,
      points: favoriteGrowthPoints,
    });
  }

  // 3. Views: 1 pt per 1000 views
  const viewsPoints = Math.floor(stats.views / 1000);
  breakdown.components.push({
    category: 'Views',
    value: stats.views,
    formula: `${stats.views} ÷ 1000`,
    points: viewsPoints,
  });

  // 4. View Growth: 2 pts per 500 new views
  const viewGrowthPoints = Math.floor((stats.viewGrowth / 500) * 2);
  if (stats.viewGrowth > 0) {
    breakdown.components.push({
      category: 'View Growth',
      value: stats.viewGrowth,
      formula: `${stats.viewGrowth} ÷ 500 × 2`,
      points: viewGrowthPoints,
    });
  }

  // 5. Comments: 5 pts per comment
  const commentsPoints = stats.comments * 5;
  breakdown.components.push({
    category: 'Comments',
    value: stats.comments,
    formula: `${stats.comments} × 5`,
    points: commentsPoints,
  });

  // 6. Comment Growth: 10 pts per new comment
  const commentGrowthPoints = stats.commentGrowth * 10;
  if (stats.commentGrowth > 0) {
    breakdown.components.push({
      category: 'Comment Growth',
      value: stats.commentGrowth,
      formula: `${stats.commentGrowth} × 10`,
      points: commentGrowthPoints,
    });
  }

  // 7. Affiliate Clicks: 2 pts per click
  const affiliatePoints = stats.affiliateClicks * 2;
  breakdown.components.push({
    category: 'Affiliate Clicks',
    value: stats.affiliateClicks,
    formula: `${stats.affiliateClicks} × 2`,
    points: affiliatePoints,
  });

  // 8. Click Growth: 5 pts per new click
  const clickGrowthPoints = stats.clickGrowth * 5;
  if (stats.clickGrowth > 0) {
    breakdown.components.push({
      category: 'Click Growth',
      value: stats.clickGrowth,
      formula: `${stats.clickGrowth} × 5`,
      points: clickGrowthPoints,
    });
  }

  // Calculate subtotal
  breakdown.subtotal =
    favoritesPoints +
    favoriteGrowthPoints +
    viewsPoints +
    viewGrowthPoints +
    commentsPoints +
    commentGrowthPoints +
    affiliatePoints +
    clickGrowthPoints;

  // BONUSES

  // 1. High Engagement Bonus: 20 pts for >10% engagement rate
  if (stats.engagementRate > 10) {
    breakdown.bonuses.push({
      type: 'High Engagement',
      condition: `${stats.engagementRate}% engagement rate`,
      points: 20,
    });
    breakdown.subtotal += 20;
  }

  // 2. Viral Content Bonus: 30 pts for >5000 views in a week
  if (stats.views > 5000) {
    breakdown.bonuses.push({
      type: 'Viral Content',
      condition: `${stats.views} views`,
      points: 30,
    });
    breakdown.subtotal += 30;
  }

  // 3. Trending Bonus: 25 pts for >100 new favorites in a week
  if (stats.favoriteGrowth > 100) {
    breakdown.bonuses.push({
      type: 'Trending',
      condition: `+${stats.favoriteGrowth} new favorites`,
      points: 25,
    });
    breakdown.subtotal += 25;
  }

  // 4. Positive Sentiment Bonus: 15 pts for sentiment score >50
  if (stats.sentimentScore > 50) {
    breakdown.bonuses.push({
      type: 'Positive Sentiment',
      condition: `Sentiment score: ${stats.sentimentScore}`,
      points: 15,
    });
    breakdown.subtotal += 15;
  }

  // PENALTIES

  // 1. Low Engagement Penalty: -15 pts for <1% engagement rate
  if (stats.engagementRate < 1 && stats.views > 100) {
    breakdown.penalties.push({
      type: 'Low Engagement',
      condition: `${stats.engagementRate}% engagement rate`,
      points: -15,
    });
    breakdown.subtotal -= 15;
  }

  // 2. Negative Sentiment Penalty: -20 pts for sentiment score <-30
  if (stats.sentimentScore < -30) {
    breakdown.penalties.push({
      type: 'Negative Sentiment',
      condition: `Sentiment score: ${stats.sentimentScore}`,
      points: -20,
    });
    breakdown.subtotal -= 20;
  }

  // 3. Declining Interest Penalty: -10 pts for losing >50 favorites
  if (stats.favoriteGrowth < -50) {
    breakdown.penalties.push({
      type: 'Declining Interest',
      condition: `${stats.favoriteGrowth} favorites lost`,
      points: -10,
    });
    breakdown.subtotal -= 10;
  }

  breakdown.total = Math.max(0, breakdown.subtotal); // Minimum 0 points

  return {
    points: breakdown.total,
    breakdown,
  };
}
