/**
 * Check what the scoring API is returning
 */

import { getDb } from '../server/db';

async function checkAPIResponse() {
  console.log('Checking API response data...\n');
  
  const db = await getDb();
  
  // Get a manufacturer stat with trend data
  const stat = await db.query.manufacturerDailyChallengeStats.findFirst({
    where: (stats, { eq }) => eq(stats.statDate, '2025-11-19'),
    orderBy: (stats, { desc }) => [desc(stats.totalPoints)],
  });
  
  if (!stat) {
    console.log('No stats found for 2025-11-19');
    process.exit(1);
  }
  
  console.log('='.repeat(80));
  console.log('RAW DATABASE RECORD');
  console.log('='.repeat(80));
  console.log(JSON.stringify(stat, null, 2));
  
  console.log('\n' + '='.repeat(80));
  console.log('FIELD TYPE CHECKS');
  console.log('='.repeat(80));
  console.log(`trendMultiplier: ${stat.trendMultiplier} (type: ${typeof stat.trendMultiplier})`);
  console.log(`trendMultiplier !== undefined: ${stat.trendMultiplier !== undefined}`);
  console.log(`trendMultiplier !== null: ${stat.trendMultiplier !== null}`);
  console.log(`streakDays: ${stat.streakDays} (type: ${typeof stat.streakDays})`);
  console.log(`streakDays !== undefined: ${stat.streakDays !== undefined}`);
  console.log(`streakDays !== null: ${stat.streakDays !== null}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('DETECTION LOGIC TEST');
  console.log('='.repeat(80));
  const shouldUseTrendBreakdown = stat.trendMultiplier !== undefined || stat.streakDays !== undefined;
  console.log(`Should use trend breakdown: ${shouldUseTrendBreakdown}`);
  
  if (shouldUseTrendBreakdown) {
    console.log('✅ Trend data should be detected!');
  } else {
    console.log('❌ Trend data NOT detected - this is the bug!');
  }
  
  process.exit(0);
}

checkAPIResponse().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
