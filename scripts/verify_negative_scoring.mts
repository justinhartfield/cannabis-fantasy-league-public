
import { calculateManufacturerTrendScore, TrendScoringStats } from '../server/trendScoringEngine';

const mockStats: TrendScoringStats = {
    orderCount: 1,
    days1: 10,
    days7: 10, // Trend multiplier will be 1.0
    days14: 10,
    previousRank: 1,
    currentRank: 11, // Dropped 10 ranks -> Should trigger max momentum penalty (-40)
    streakDays: 0,
    marketSharePercent: 0,
    dailyVolumes: [10, 10, 10]
};

console.log('--- Testing Negative Scoring ---');
const score = calculateManufacturerTrendScore(mockStats);

console.log('Order Count Points:', score.orderCountPoints); // Expected: 5
console.log('Trend Momentum Points:', score.trendMomentumPoints); // Expected: 25 (1.0 * 25)
console.log('Momentum Bonus Points:', score.momentumBonusPoints); // Expected: -40
console.log('Total Points:', score.totalPoints); // Expected: 5 + 25 - 40 = -10

if (score.totalPoints < 0) {
    console.log('❌ FAILED: Total score is negative');
} else {
    console.log('✅ PASSED: Total score is non-negative');
}
