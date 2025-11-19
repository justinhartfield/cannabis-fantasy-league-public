/**
 * Check if trend data is in the database
 */

import { getDb } from '../server/db';

async function checkTrendData() {
  console.log('Checking for trend data in database...\n');
  
  const db = await getDb();
  
  // Check manufacturers
  const manufacturers = await db.query.manufacturerDailyChallengeStats.findMany({
    limit: 5,
    orderBy: (stats, { desc }) => [desc(stats.statDate)],
  });
  
  console.log('='.repeat(80));
  console.log('MANUFACTURER STATS (Latest 5)');
  console.log('='.repeat(80));
  
  for (const stat of manufacturers) {
    console.log(`\nDate: ${stat.statDate}`);
    console.log(`Manufacturer ID: ${stat.manufacturerId}`);
    console.log(`Orders: ${stat.orderCount}`);
    console.log(`Points: ${stat.totalPoints}`);
    console.log(`Rank: ${stat.rank}`);
    console.log(`Previous Rank: ${stat.previousRank}`);
    console.log(`Trend Multiplier: ${stat.trendMultiplier}`);
    console.log(`Consistency Score: ${stat.consistencyScore}`);
    console.log(`Velocity Score: ${stat.velocityScore}`);
    console.log(`Streak Days: ${stat.streakDays}`);
    console.log(`Market Share: ${stat.marketSharePercent}`);
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ANALYSIS');
  console.log('='.repeat(80));
  
  const withTrendData = manufacturers.filter(m => 
    m.trendMultiplier !== null && 
    m.trendMultiplier !== undefined &&
    m.trendMultiplier !== '0'
  );
  
  console.log(`\nTotal records checked: ${manufacturers.length}`);
  console.log(`Records with trend data: ${withTrendData.length}`);
  console.log(`Records without trend data: ${manufacturers.length - withTrendData.length}`);
  
  if (withTrendData.length === 0) {
    console.log('\n⚠️  WARNING: No trend data found! The aggregation may not have saved properly.');
  } else {
    console.log('\n✅ Trend data is present in the database!');
  }
  
  process.exit(0);
}

checkTrendData().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
