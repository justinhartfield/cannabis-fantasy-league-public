import 'dotenv/config';
import { getDb } from './server/db.js';
import fs from 'fs';

async function runMigration() {
  console.log('[Migration] Adding prediction streak tables...');
  
  const db = await getDb();
  if (!db) {
    console.error('[Migration] Database not available');
    process.exit(1);
  }

  try {
    const sql = fs.readFileSync('./drizzle/migrations/add_prediction_streak_tables.sql', 'utf8');
    await db.execute(sql);
    
    console.log('[Migration] Successfully added prediction tables');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Error:', error);
    process.exit(1);
  }
}

runMigration();
