import "dotenv/config";
import { getDb } from '../server/db';
import { dailyMatchups, userPredictions } from '../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) process.exit(1);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  console.log(`Verifying results for ${yesterdayStr}...`);

  const matchups = await db
    .select()
    .from(dailyMatchups)
    .where(eq(dailyMatchups.matchupDate, yesterdayStr));

  const matchupIds = matchups.map(m => m.id);
  
  const predictions = await db
    .select()
    .from(userPredictions)
    .where(inArray(userPredictions.matchupId, matchupIds));

  let correctCount = 0;
  let totalCount = 0;

  for (const p of predictions) {
      totalCount++;
      if (p.isCorrect === 1) correctCount++;
  }

  console.log(`Total predictions found for yesterday: ${totalCount}`);
  console.log(`Correct predictions (isCorrect=1): ${correctCount}`);
  
  if (totalCount > 0) {
      console.log(`Calculated Accuracy in DB: ${((correctCount / totalCount) * 100).toFixed(1)}%`);
  } else {
      console.log('No predictions found.');
  }

  process.exit(0);
}

main().catch(console.error);
