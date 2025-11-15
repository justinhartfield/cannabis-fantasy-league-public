import 'dotenv/config';
import { getDb } from '../server/db.js';
import { leagues } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function fixLeagueType() {
  const db = await getDb();
  
  // Check current value
  const league = await db.select().from(leagues).where(eq(leagues.id, 7)).limit(1);
  console.log('League 7 before:', JSON.stringify(league[0], null, 2));
  
  // Update to challenge type
  await db.update(leagues)
    .set({ leagueType: 'challenge' })
    .where(eq(leagues.id, 7));
  
  // Verify update
  const updated = await db.select().from(leagues).where(eq(leagues.id, 7)).limit(1);
  console.log('League 7 after:', JSON.stringify(updated[0], null, 2));
}

fixLeagueType().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
