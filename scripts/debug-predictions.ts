
import "dotenv/config";
import { getDb } from '../server/db';
import { dailyMatchups, userPredictions, users } from '../drizzle/schema';
import { desc, eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  console.log('Fetching recent matchups...');
  const matchups = await db
    .select()
    .from(dailyMatchups)
    .orderBy(desc(dailyMatchups.matchupDate))
    .limit(20);

  console.log(`Found ${matchups.length} matchups.`);

  for (const matchup of matchups) {
    console.log(`\nMatchup ID: ${matchup.id}`);
    console.log(`Date: ${matchup.matchupDate}`);
    console.log(`Entity A: ${matchup.entityAName} (ID: ${matchup.entityAId}) - Points: ${matchup.entityAPoints}`);
    console.log(`Entity B: ${matchup.entityBName} (ID: ${matchup.entityBId}) - Points: ${matchup.entityBPoints}`);
    console.log(`Winner ID: ${matchup.winnerId}`);
    console.log(`Is Scored: ${matchup.isScored}`);

    const predictions = await db
      .select()
      .from(userPredictions)
      .where(eq(userPredictions.matchupId, matchup.id));

    console.log(`Predictions: ${predictions.length}`);
    for (const p of predictions) {
        const user = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
        const userName = user[0]?.name || user[0]?.email || p.userId;
        console.log(`  User: ${userName} (ID: ${p.userId})`);
        console.log(`  Predicted Winner ID: ${p.predictedWinnerId}`);
        console.log(`  Is Correct: ${p.isCorrect}`);
        
        if (matchup.winnerId !== null) {
            const calculatedIsCorrect = p.predictedWinnerId === matchup.winnerId ? 1 : 0;
            console.log(`  Calculated Check: ${calculatedIsCorrect === 1 ? 'CORRECT' : 'INCORRECT'} (Expected isCorrect: ${calculatedIsCorrect})`);
            
            if (p.isCorrect !== calculatedIsCorrect) {
                console.warn(`  MISMATCH DETECTED! DB says ${p.isCorrect}, but calculation says ${calculatedIsCorrect}`);
            }
        }
    }
  }
  
  process.exit(0);
}

main().catch(console.error);

