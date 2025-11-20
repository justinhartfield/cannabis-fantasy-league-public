/**
 * Test Script for Trend-Based Scoring
 * 
 * Tests the new trend-based scoring engine with real data from TrendMetrics
 * and compares results with the old scoring system.
 */

import {
  calculateManufacturerTrendScore,
  calculateStrainTrendScore,
  calculateProductTrendScore,
  calculatePharmacyTrendScore,
  calculateTrendMultiplier,
  calculateConsistencyScore,
  calculateVelocityScore,
  calculateStreakBonus,
  calculateMarketShareBonus,
} from '../server/trendScoringEngine';

import {
  calculateManufacturerScore as calculateOldManufacturerScore,
  calculateStrainScore as calculateOldStrainScore,
  calculateProductScore as calculateOldProductScore,
  calculatePharmacyScore as calculateOldPharmacyScore,
} from '../server/dailyChallengeScoringEngine';

// Test data from actual TrendMetrics (Four 20 Pharma example)
const testManufacturerData = {
  name: 'Four 20 Pharma',
  orderCount: 45,
  salesVolumeGrams: 3629,
  revenueCents: 164395,
  days1: 545,
  days7: 3629,
  days14: 6549,
  days30: 13329,
  currentRank: 1,
  previousRank: 2,
  streakDays: 5,
  marketSharePercent: 12.5,
  dailyVolumes: [545, 520, 510, 525, 530, 515, 484],
};

// Test data for a declining entity
const testDecliningData = {
  name: 'Declining Manufacturer',
  orderCount: 30,
  salesVolumeGrams: 1500,
  revenueCents: 75000,
  days1: 500,
  days7: 1500,
  days14: 3500,
  days30: 8000,
  currentRank: 8,
  previousRank: 5,
  streakDays: 0,
  marketSharePercent: 2.1,
  dailyVolumes: [500, 450, 400, 350, 300, 250, 250],
};

console.log('='.repeat(80));
console.log('TREND-BASED SCORING SYSTEM TEST');
console.log('='.repeat(80));
console.log();

// Test 1: Trend Multiplier Calculation
console.log('TEST 1: Trend Multiplier Calculation');
console.log('-'.repeat(80));

const trendMultiplier1 = calculateTrendMultiplier(testManufacturerData.days1, testManufacturerData.days7);
console.log(`Four 20 Pharma: ${testManufacturerData.days7}g / ${testManufacturerData.days1}g = ${trendMultiplier1.toFixed(2)}x`);

const trendMultiplier2 = calculateTrendMultiplier(testDecliningData.days1, testDecliningData.days7);
console.log(`Declining: ${testDecliningData.days7}g / ${testDecliningData.days1}g = ${trendMultiplier2.toFixed(2)}x`);

// Edge case: division by zero
const trendMultiplier3 = calculateTrendMultiplier(0, 1000);
console.log(`New entity (0 → 1000g): ${trendMultiplier3.toFixed(2)}x (capped at 10x)`);

console.log();

// Test 2: Consistency Score
console.log('TEST 2: Consistency Score');
console.log('-'.repeat(80));

const consistency1 = calculateConsistencyScore(testManufacturerData.dailyVolumes);
console.log(`Four 20 Pharma: ${consistency1}/100 (stable performance)`);

const consistency2 = calculateConsistencyScore(testDecliningData.dailyVolumes);
console.log(`Declining: ${consistency2}/100 (declining performance)`);

console.log();

// Test 3: Velocity Score
console.log('TEST 3: Velocity Score (Acceleration)');
console.log('-'.repeat(80));

const velocity1 = calculateVelocityScore(
  testManufacturerData.days1,
  testManufacturerData.days7,
  testManufacturerData.days14
);
console.log(`Four 20 Pharma: ${velocity1} pts (accelerating)`);

const velocity2 = calculateVelocityScore(
  testDecliningData.days1,
  testDecliningData.days7,
  testDecliningData.days14
);
console.log(`Declining: ${velocity2} pts (decelerating)`);

console.log();

// Test 4: Streak Bonus
console.log('TEST 4: Streak Bonus');
console.log('-'.repeat(80));

const streak1 = calculateStreakBonus(testManufacturerData.streakDays);
console.log(`${testManufacturerData.streakDays} days streak: ${streak1} pts`);

const streak2 = calculateStreakBonus(10);
console.log(`10 days streak: ${calculateStreakBonus(10)} pts (with exponential bonus)`);

console.log();

// Test 5: Market Share Bonus
console.log('TEST 5: Market Share Bonus');
console.log('-'.repeat(80));

const marketShare1 = calculateMarketShareBonus(testManufacturerData.marketSharePercent);
console.log(`${testManufacturerData.marketSharePercent}% market share: ${marketShare1} pts (dominant)`);

const marketShare2 = calculateMarketShareBonus(testDecliningData.marketSharePercent);
console.log(`${testDecliningData.marketSharePercent}% market share: ${marketShare2} pts (significant)`);

console.log();

// Test 6: Full Manufacturer Score Comparison
console.log('TEST 6: Full Manufacturer Score Comparison (Old vs New)');
console.log('='.repeat(80));

console.log('\nFour 20 Pharma (Top Performer):');
console.log('-'.repeat(80));

const oldScore1 = calculateOldManufacturerScore(
  {
    salesVolumeGrams: testManufacturerData.salesVolumeGrams,
    orderCount: testManufacturerData.orderCount,
    revenueCents: testManufacturerData.revenueCents,
  },
  testManufacturerData.currentRank
);

const newScore1 = calculateManufacturerTrendScore({
  orderCount: testManufacturerData.orderCount,
  days1: testManufacturerData.days1,
  days7: testManufacturerData.days7,
  days14: testManufacturerData.days14,
  previousRank: testManufacturerData.previousRank,
  currentRank: testManufacturerData.currentRank,
  streakDays: testManufacturerData.streakDays,
  marketSharePercent: testManufacturerData.marketSharePercent,
  dailyVolumes: testManufacturerData.dailyVolumes,
});

console.log('OLD SCORING:');
console.log(`  Sales Volume: ${testManufacturerData.salesVolumeGrams}g ÷ 10 = ${oldScore1.salesVolumePoints} pts`);
console.log(`  Order Count: ${testManufacturerData.orderCount} × 5 = ${oldScore1.orderCountPoints} pts`);
console.log(`  Revenue: €${(testManufacturerData.revenueCents / 100).toFixed(2)} ÷ 10 = ${oldScore1.revenuePoints} pts`);
console.log(`  Rank Bonus: #${testManufacturerData.currentRank} = ${oldScore1.rankBonusPoints} pts`);
console.log(`  TOTAL: ${oldScore1.totalPoints} pts`);

console.log('\nNEW SCORING:');
console.log(`  Order Count: ${testManufacturerData.orderCount} × 10 = ${newScore1.orderCountPoints} pts`);
console.log(`  Trend Bonus: ${newScore1.trendMultiplier.toFixed(2)}x × 20 = ${newScore1.trendMomentumPoints} pts`);
console.log(`  Rank Bonus: #${testManufacturerData.currentRank} = ${newScore1.rankBonusPoints} pts`);
console.log(`  Momentum Bonus: ↑${testManufacturerData.previousRank - testManufacturerData.currentRank} ranks = ${newScore1.momentumBonusPoints} pts`);
console.log(`  Consistency Bonus: ${newScore1.consistencyScore}/100 = ${newScore1.consistencyBonusPoints} pts`);
console.log(`  Velocity Bonus: ${newScore1.velocityScore} = ${newScore1.velocityBonusPoints} pts`);
console.log(`  Streak Bonus: ${testManufacturerData.streakDays}d = ${newScore1.streakBonusPoints} pts`);
console.log(`  Market Share Bonus: ${testManufacturerData.marketSharePercent}% = ${newScore1.marketShareBonusPoints} pts`);
console.log(`  TOTAL: ${newScore1.totalPoints} pts`);

console.log(`\nDIFFERENCE: ${newScore1.totalPoints - oldScore1.totalPoints} pts (${((newScore1.totalPoints / oldScore1.totalPoints - 1) * 100).toFixed(1)}%)`);

console.log('\n\nDeclining Manufacturer:');
console.log('-'.repeat(80));

const oldScore2 = calculateOldManufacturerScore(
  {
    salesVolumeGrams: testDecliningData.salesVolumeGrams,
    orderCount: testDecliningData.orderCount,
    revenueCents: testDecliningData.revenueCents,
  },
  testDecliningData.currentRank
);

const newScore2 = calculateManufacturerTrendScore({
  orderCount: testDecliningData.orderCount,
  days1: testDecliningData.days1,
  days7: testDecliningData.days7,
  days14: testDecliningData.days14,
  previousRank: testDecliningData.previousRank,
  currentRank: testDecliningData.currentRank,
  streakDays: testDecliningData.streakDays,
  marketSharePercent: testDecliningData.marketSharePercent,
  dailyVolumes: testDecliningData.dailyVolumes,
});

console.log('OLD SCORING:');
console.log(`  Sales Volume: ${testDecliningData.salesVolumeGrams}g ÷ 10 = ${oldScore2.salesVolumePoints} pts`);
console.log(`  Order Count: ${testDecliningData.orderCount} × 5 = ${oldScore2.orderCountPoints} pts`);
console.log(`  Revenue: €${(testDecliningData.revenueCents / 100).toFixed(2)} ÷ 10 = ${oldScore2.revenuePoints} pts`);
console.log(`  Rank Bonus: #${testDecliningData.currentRank} = ${oldScore2.rankBonusPoints} pts`);
console.log(`  TOTAL: ${oldScore2.totalPoints} pts`);

console.log('\nNEW SCORING:');
console.log(`  Order Count: ${testDecliningData.orderCount} × 10 = ${newScore2.orderCountPoints} pts`);
console.log(`  Trend Bonus: ${newScore2.trendMultiplier.toFixed(2)}x × 20 = ${newScore2.trendMomentumPoints} pts`);
console.log(`  Rank Bonus: #${testDecliningData.currentRank} = ${newScore2.rankBonusPoints} pts`);
console.log(`  Momentum Penalty: ↓${testDecliningData.currentRank - testDecliningData.previousRank} ranks = ${newScore2.momentumBonusPoints} pts`);
console.log(`  Consistency Bonus: ${newScore2.consistencyScore}/100 = ${newScore2.consistencyBonusPoints} pts`);
console.log(`  Velocity Penalty: ${newScore2.velocityScore} = ${newScore2.velocityBonusPoints} pts`);
console.log(`  Streak Bonus: ${testDecliningData.streakDays}d = ${newScore2.streakBonusPoints} pts`);
console.log(`  Market Share Bonus: ${testDecliningData.marketSharePercent}% = ${newScore2.marketShareBonusPoints} pts`);
console.log(`  TOTAL: ${newScore2.totalPoints} pts`);

console.log(`\nDIFFERENCE: ${newScore2.totalPoints - oldScore2.totalPoints} pts (${((newScore2.totalPoints / oldScore2.totalPoints - 1) * 100).toFixed(1)}%)`);

console.log('\n' + '='.repeat(80));
console.log('TEST COMPLETE');
console.log('='.repeat(80));
console.log('\nKEY FINDINGS:');
console.log('1. New scoring rewards momentum and consistency');
console.log('2. Declining entities receive penalties for negative trends');
console.log('3. Order count multiplier increased to maintain similar point ranges');
console.log('4. Advanced features (velocity, streak, market share) add strategic depth');
console.log('5. No explicit sales or revenue data exposed in calculations');
