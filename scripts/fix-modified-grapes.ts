/**
 * Fix Modified Grapes trendMultiplier
 * 
 * Manually update Modified Grapes' trendMultiplier from 0.00 to 1.00
 * to fix the scoring breakdown display.
 */

import { getDb } from '../server/db';
import { strainDailyChallengeStats } from '../drizzle/dailyChallengeSchema';
import { cannabisStrains } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function fixModifiedGrapes() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  console.log('🔧 Fixing Modified Grapes trendMultiplier...\n');

  // Find Modified Grapes strain
  const strain = await db.query.cannabisStrains.findFirst({
    where: (cannabisStrains, { sql }) => sql`LOWER(${cannabisStrains.name}) = LOWER('Modified Grapes')`,
  });

  if (!strain) {
    console.error('❌ Modified Grapes strain not found');
    process.exit(1);
  }

  console.log(`✅ Found strain: ${strain.name} (ID: ${strain.id})`);

  // Get today's date
  const today = new Date().toISOString().split('T')[0];
  console.log(`📅 Updating record for date: ${today}`);

  // Update the trendMultiplier
  const result = await db
    .update(strainDailyChallengeStats)
    .set({
      trendMultiplier: '1.00',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(strainDailyChallengeStats.strainId, strain.id),
        eq(strainDailyChallengeStats.statDate, today)
      )
    );

  console.log(`\n✅ Updated Modified Grapes trendMultiplier to 1.00`);
  console.log(`📊 Rows affected: ${result.rowCount || 'unknown'}`);

  // Verify the update
  const updated = await db.query.strainDailyChallengeStats.findFirst({
    where: and(
      eq(strainDailyChallengeStats.strainId, strain.id),
      eq(strainDailyChallengeStats.statDate, today)
    ),
  });

  if (updated) {
    console.log(`\n📈 Verified update:`);
    console.log(`  Date: ${updated.statDate}`);
    console.log(`  Order Count: ${updated.orderCount}`);
    console.log(`  Trend Multiplier: ${updated.trendMultiplier}`);
    console.log(`  Total Points: ${updated.totalPoints}`);
  }

  console.log('\n✅ Fix complete! Refresh the page to see the changes.\n');
  process.exit(0);
}

fixModifiedGrapes().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
