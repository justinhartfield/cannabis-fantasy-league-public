
import { calculateStrainTrendScore, calculateTrendMultiplier, calculateManufacturerTrendScore } from './server/trendScoringEngine';
import { buildStrainTrendBreakdown, buildManufacturerTrendBreakdown } from './server/trendScoringBreakdowns';

console.log('--- Strain Test (Empty Stats) ---');
const emptyStats = {
  orderCount: 0,
  days1: 0,
  days7: 0,
  currentRank: 0,
  previousRank: 0,
  streakDays: 0,
  marketSharePercent: 0,
  consistencyScore: 0,
  velocityScore: 0,
};

const score = calculateStrainTrendScore(emptyStats);
console.log('Score object:', score);

const breakdown = buildStrainTrendBreakdown(score, 0, 0, 0, 0);
console.log('Breakdown total:', breakdown.breakdown.total);
console.log('Breakdown subtotal:', breakdown.breakdown.subtotal);
console.log('Components:', breakdown.breakdown.components);
console.log('Bonuses:', breakdown.breakdown.bonuses);


console.log('\n--- Manufacturer Test (White Runtz case?) ---');
// Try to find inputs that give: Order 16, Trend 15, Rank 5. Total 47.
// Order 16 -> 2 orders (manufacturer is 10 per order? No, White Runtz was 2x8=16, so it's a strain)
// Wait, White Runtz had "2 orders -> 2 x 8 = 16 pts". So it's a strain.
// Trend 15 -> 1.0x multiplier.
// Rank 5 -> Rank Bonus for Strain. rank6to10 is 5pts.
// So inputs: orderCount 2, trendMultiplier 1.0, rank 6.

const whiteRuntzStats = {
  orderCount: 2,
  days1: 10, // dummy
  days7: 10, // dummy to get 1.0
  trendMultiplier: 1.0,
  currentRank: 6,
  previousRank: 6, // no momentum
  streakDays: 0,
  marketSharePercent: 0,
  consistencyScore: 0, // Let's see if consistency gives 11 pts? 11 / 0.4 = 27.5
  velocityScore: 0,
};

// Test Consistency
whiteRuntzStats.consistencyScore = 28; // 28 * 0.4 = 11.2 -> 11 pts.

const wrScore = calculateStrainTrendScore(whiteRuntzStats);
console.log('White Runtz Score:', wrScore);
console.log('Calculated Total:', wrScore.totalPoints);

const wrBreakdown = buildStrainTrendBreakdown(wrScore, 2, 6, 6, 0);
console.log('WR Bonuses:', wrBreakdown.breakdown.bonuses);

