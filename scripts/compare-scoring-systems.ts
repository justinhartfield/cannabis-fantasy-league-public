/**
 * Compare Scoring Systems
 * 
 * Fetches real data from the database and compares old vs new scoring
 * for all entity types to validate the redesign.
 */

import { getDb } from '../server/db';
import { getMetabaseClient } from '../server/metabase';
import {
  calculateManufacturerScore as calculateOldManufacturerScore,
  calculateStrainScore as calculateOldStrainScore,
} from '../server/dailyChallengeScoringEngine';
import {
  calculateManufacturerTrendScore,
  calculateStrainTrendScore,
} from '../server/trendScoringEngine';
import {
  fetchTrendMetrics,
  calculateDailyVolumes,
} from '../server/trendMetricsFetcher';

interface ComparisonResult {
  name: string;
  rank: number;
  oldScore: number;
  newScore: number;
  difference: number;
  percentChange: number;
}

async function compareManufacturers(limit: number = 10): Promise<ComparisonResult[]> {
  console.log(`\nFetching top ${limit} manufacturers from TrendMetrics...`);
  
  const metabase = getMetabaseClient();
  const query = `db.TrendMetrics.find({ "entity": "productManufacturer" }).sort({ "days90Rank": 1 }).limit(${limit})`;
  const result = await metabase.executeQuery(query);
  
  if (!result || !result.data) {
    throw new Error('Failed to fetch manufacturer data');
  }
  
  const comparisons: ComparisonResult[] = [];
  
  for (const record of result.data) {
    const name = record.EntityName || record.entityName;
    const orderCount = Math.floor((record.Days7 || record.days7) / 80); // Estimate orders
    const salesVolumeGrams = record.Days7 || record.days7;
    const revenueCents = Math.floor(salesVolumeGrams * 45); // Estimate revenue
    const rank = record.Days7Rank || record.days7Rank;
    const previousRank = (record.Days14Rank || record.days14Rank) || rank;
    
    // Calculate old score
    const oldScore = calculateOldManufacturerScore(
      { salesVolumeGrams, orderCount, revenueCents },
      rank
    );
    
    // Calculate new score
    const newScore = calculateManufacturerTrendScore({
      orderCount,
      days1: record.Days1 || record.days1,
      days7: record.Days7 || record.days7,
      days14: record.Days14 || record.days14,
      previousRank,
      currentRank: rank,
      streakDays: rank <= 10 ? 3 : 0, // Estimate
      marketSharePercent: ((record.Days7 || record.days7) / 50000) * 100, // Estimate
      dailyVolumes: calculateDailyVolumes({
        entityId: record.EntityId || record.entityId,
        entityName: name,
        entity: 'productManufacturer',
        days1: record.Days1 || record.days1,
        days7: record.Days7 || record.days7,
        days14: record.Days14 || record.days14,
        days30: record.Days30 || record.days30,
        days60: record.Days60 || record.days60,
        days90: record.Days90 || record.days90,
        days1Rank: record.Days1Rank || record.days1Rank,
        days7Rank: record.Days7Rank || record.days7Rank,
        days14Rank: record.Days14Rank || record.days14Rank,
        days30Rank: record.Days30Rank || record.days30Rank,
        days60Rank: record.Days60Rank || record.days60Rank,
        days90Rank: record.Days90Rank || record.days90Rank,
      }),
    });
    
    comparisons.push({
      name,
      rank,
      oldScore: oldScore.totalPoints,
      newScore: newScore.totalPoints,
      difference: newScore.totalPoints - oldScore.totalPoints,
      percentChange: ((newScore.totalPoints / oldScore.totalPoints - 1) * 100),
    });
  }
  
  return comparisons;
}

async function compareStrains(limit: number = 10): Promise<ComparisonResult[]> {
  console.log(`\nFetching top ${limit} strains from TrendMetrics...`);
  
  const metabase = getMetabaseClient();
  const query = `db.TrendMetrics.find({ "entity": "productStrainName" }).sort({ "days90Rank": 1 }).limit(${limit})`;
  const result = await metabase.executeQuery(query);
  
  if (!result || !result.data) {
    throw new Error('Failed to fetch strain data');
  }
  
  const comparisons: ComparisonResult[] = [];
  
  for (const record of result.data) {
    const name = record.EntityName || record.entityName;
    const orderCount = Math.floor((record.Days7 || record.days7) / 100);
    const salesVolumeGrams = record.Days7 || record.days7;
    const rank = record.Days7Rank || record.days7Rank;
    const previousRank = (record.Days14Rank || record.days14Rank) || rank;
    
    const oldScore = calculateOldStrainScore(
      { salesVolumeGrams, orderCount },
      rank
    );
    
    const newScore = calculateStrainTrendScore({
      orderCount,
      days1: record.Days1 || record.days1,
      days7: record.Days7 || record.days7,
      days14: record.Days14 || record.days14,
      previousRank,
      currentRank: rank,
      streakDays: rank <= 10 ? 2 : 0,
      marketSharePercent: ((record.Days7 || record.days7) / 80000) * 100,
      dailyVolumes: calculateDailyVolumes({
        entityId: record.EntityId || record.entityId,
        entityName: name,
        entity: 'productStrainName',
        days1: record.Days1 || record.days1,
        days7: record.Days7 || record.days7,
        days14: record.Days14 || record.days14,
        days30: record.Days30 || record.days30,
        days60: record.Days60 || record.days60,
        days90: record.Days90 || record.days90,
        days1Rank: record.Days1Rank || record.days1Rank,
        days7Rank: record.Days7Rank || record.days7Rank,
        days14Rank: record.Days14Rank || record.days14Rank,
        days30Rank: record.Days30Rank || record.days30Rank,
        days60Rank: record.Days60Rank || record.days60Rank,
        days90Rank: record.Days90Rank || record.days90Rank,
      }),
    });
    
    comparisons.push({
      name,
      rank,
      oldScore: oldScore.totalPoints,
      newScore: newScore.totalPoints,
      difference: newScore.totalPoints - oldScore.totalPoints,
      percentChange: ((newScore.totalPoints / oldScore.totalPoints - 1) * 100),
    });
  }
  
  return comparisons;
}

function printComparisonTable(title: string, comparisons: ComparisonResult[]) {
  console.log();
  console.log('='.repeat(100));
  console.log(title);
  console.log('='.repeat(100));
  console.log();
  
  // Header
  console.log(
    'Rank'.padEnd(6) +
    'Name'.padEnd(30) +
    'Old Score'.padStart(12) +
    'New Score'.padStart(12) +
    'Difference'.padStart(12) +
    'Change %'.padStart(12)
  );
  console.log('-'.repeat(100));
  
  // Rows
  for (const comp of comparisons) {
    const diffStr = comp.difference >= 0 ? `+${comp.difference}` : `${comp.difference}`;
    const pctStr = comp.percentChange >= 0 ? `+${comp.percentChange.toFixed(1)}%` : `${comp.percentChange.toFixed(1)}%`;
    
    console.log(
      `#${comp.rank}`.padEnd(6) +
      comp.name.substring(0, 28).padEnd(30) +
      comp.oldScore.toString().padStart(12) +
      comp.newScore.toString().padStart(12) +
      diffStr.padStart(12) +
      pctStr.padStart(12)
    );
  }
  
  // Summary statistics
  console.log('-'.repeat(100));
  const avgOld = comparisons.reduce((sum, c) => sum + c.oldScore, 0) / comparisons.length;
  const avgNew = comparisons.reduce((sum, c) => sum + c.newScore, 0) / comparisons.length;
  const avgDiff = avgNew - avgOld;
  const avgPct = (avgNew / avgOld - 1) * 100;
  
  console.log(
    'AVERAGE'.padEnd(36) +
    avgOld.toFixed(0).padStart(12) +
    avgNew.toFixed(0).padStart(12) +
    (avgDiff >= 0 ? `+${avgDiff.toFixed(0)}` : avgDiff.toFixed(0)).padStart(12) +
    (avgPct >= 0 ? `+${avgPct.toFixed(1)}%` : `${avgPct.toFixed(1)}%`).padStart(12)
  );
  
  console.log();
}

async function main() {
  console.log('='.repeat(100));
  console.log('SCORING SYSTEM COMPARISON');
  console.log('Old System vs New Trend-Based System');
  console.log('='.repeat(100));
  
  try {
    // Compare manufacturers
    const manufacturerComparisons = await compareManufacturers(15);
    printComparisonTable('MANUFACTURERS - Top 15', manufacturerComparisons);
    
    // Compare strains
    const strainComparisons = await compareStrains(15);
    printComparisonTable('STRAINS - Top 15', strainComparisons);
    
    // Overall analysis
    console.log('='.repeat(100));
    console.log('ANALYSIS');
    console.log('='.repeat(100));
    console.log();
    console.log('Key Observations:');
    console.log('1. New scoring emphasizes momentum and consistency over raw volume');
    console.log('2. Top performers with strong trends receive higher scores');
    console.log('3. Declining entities face penalties for negative momentum');
    console.log('4. Advanced features (velocity, streak, market share) add depth');
    console.log('5. Order count multiplier increased to maintain similar point ranges');
    console.log();
    console.log('Privacy Benefits:');
    console.log('✓ No explicit sales volumes displayed');
    console.log('✓ No revenue amounts shown');
    console.log('✓ Relative trends (e.g., "6.5x momentum") replace absolute numbers');
    console.log('✓ Rank-based bonuses maintain competitive gameplay');
    console.log();
    
  } catch (error) {
    console.error('Error running comparison:', error);
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log('Comparison complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Comparison failed:', error);
    process.exit(1);
  });
