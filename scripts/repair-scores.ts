import "dotenv/config";
import { getDb } from '../server/db';
import { dailyMatchups } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { scorePreviousDayMatchups } from '../server/predictionService';

async function main() {
  console.log('Starting score repair...');
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  // Calculate yesterday exactly as predictionService does
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  console.log(`Targeting date: ${yesterdayStr}`);

  // 1. Reset matchups for yesterday
  // We set isScored = false so scorePreviousDayMatchups picks them up
  const result = await db.update(dailyMatchups)
    .set({
      isScored: false,
      winnerId: null,
      entityAPoints: null,
      entityBPoints: null
    })
    .where(eq(dailyMatchups.matchupDate, yesterdayStr))
    .returning();

  console.log(`Reset ${result.length} matchups to unscored state.`);

  if (result.length === 0) {
      console.log('No matchups found for yesterday. Nothing to repair.');
  } else {
      // 2. Trigger scoring
      // This will run the NEW logic from predictionService.ts (calculating points from raw stats)
      // and then update user predictions.
      console.log('Triggering re-scoring logic...');
      await scorePreviousDayMatchups();
  }

  console.log('Repair complete.');
  process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
