/**
 * Check Strain Trend Data
 * 
 * This script queries the database to check the actual trend data
 * for specific strains to debug why some show old format and others don't.
 */

import { getDb } from '../server/db';
import { strainDailyChallengeStats } from '../drizzle/dailyChallengeSchema';
import { cannabisStrains } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

async function checkStrainTrendData() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  console.log('🔍 Checking strain trend data...\n');

  // Strains to check
  const strainNames = ['PINK KUSH', 'HINDU KUSH', 'MODIFIED GRAPES'];

  for (const strainName of strainNames) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 ${strainName}`);
    console.log('='.repeat(60));

    // Find the strain
    const strain = await db.query.cannabisStrains.findFirst({
      where: eq(cannabisStrains.name, strainName),
    });

    if (!strain) {
      console.log(`❌ Strain not found in database`);
      continue;
    }

    console.log(`✅ Strain ID: ${strain.id}`);

    // Get the latest stats for this strain
    const stats = await db
      .select()
      .from(strainDailyChallengeStats)
      .where(eq(strainDailyChallengeStats.strainId, strain.id))
      .orderBy(desc(strainDailyChallengeStats.statDate))
      .limit(3);

    if (stats.length === 0) {
      console.log(`❌ No stats found for this strain`);
      continue;
    }

    console.log(`\n📈 Latest ${stats.length} records:\n`);

    for (const stat of stats) {
      console.log(`Date: ${stat.statDate}`);
      console.log(`  Order Count: ${stat.orderCount}`);
      console.log(`  Sales Volume: ${stat.salesVolumeGrams}g`);
      console.log(`  Total Points: ${stat.totalPoints}`);
      console.log(`  Rank: ${stat.rank}`);
      console.log(`  Previous Rank: ${stat.previousRank}`);
      console.log(`  Trend Multiplier: ${stat.trendMultiplier} (type: ${typeof stat.trendMultiplier})`);
      console.log(`  Consistency Score: ${stat.consistencyScore}`);
      console.log(`  Velocity Score: ${stat.velocityScore}`);
      console.log(`  Streak Days: ${stat.streakDays}`);
      console.log(`  Market Share: ${stat.marketSharePercent}%`);
      
      // Check if trend data would be detected
      const hasTrendData = 
        (stat.trendMultiplier !== null && stat.trendMultiplier !== undefined && Number(stat.trendMultiplier) !== 0) ||
        (stat.streakDays !== null && Number(stat.streakDays ?? 0) > 0) ||
        (stat.previousRank !== null && stat.previousRank !== undefined && stat.previousRank !== 0);
      
      console.log(`  🎯 Would use trend scoring: ${hasTrendData ? '✅ YES' : '❌ NO'}`);
      console.log('');
    }
  }

  console.log('\n✅ Check complete!\n');
  process.exit(0);
}

checkStrainTrendData().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
