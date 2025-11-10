import { getDb } from './server/db.js';

async function runMigration() {
  console.log('[Migration] Starting...');
  
  const db = await getDb();
  if (!db) {
    console.error('[Migration] Database not available');
    process.exit(1);
  }

  try {
    // Add draft state columns to leagues table
    await db.execute(`
      ALTER TABLE leagues 
      ADD COLUMN IF NOT EXISTS draftStarted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS draftCompleted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS currentDraftPick INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS currentDraftRound INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS draftPickTimeLimit INTEGER DEFAULT 120
    `);
    
    console.log('[Migration] Successfully added draft state columns');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Error:', error);
    process.exit(1);
  }
}

runMigration();
