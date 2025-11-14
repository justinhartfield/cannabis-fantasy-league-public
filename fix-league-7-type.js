import 'dotenv/config';
import { getDb } from './server/db.js';

async function fixLeague7Type() {
  console.log('[Migration] Fixing league 7 type...');
  
  const db = await getDb();
  if (!db) {
    console.error('[Migration] Database not available');
    process.exit(1);
  }

  try {
    // Check current value
    const before = await db.execute(`SELECT id, name, "leagueType" FROM leagues WHERE id = 7`);
    console.log('[Migration] League 7 before:', before.rows[0]);
    
    // Update to challenge type
    await db.execute(`
      UPDATE leagues 
      SET "leagueType" = 'challenge' 
      WHERE id = 7
    `);
    
    // Verify the change
    const after = await db.execute(`SELECT id, name, "leagueType" FROM leagues WHERE id = 7`);
    console.log('[Migration] League 7 after:', after.rows[0]);
    
    console.log('[Migration] Successfully updated league 7 to challenge type');
    process.exit(0);
  } catch (error) {
    console.error('[Migration] Error:', error);
    process.exit(1);
  }
}

fixLeague7Type();
