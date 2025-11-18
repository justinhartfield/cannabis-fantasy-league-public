/**
 * Run Trend Scoring Migration
 * 
 * Applies the database migration to add trend-based scoring fields
 * and optionally backfills data for existing records.
 */

import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('='.repeat(80));
  console.log('TREND SCORING MIGRATION');
  console.log('='.repeat(80));
  console.log();

  const db = await getDb();

  try {
    // Read migration SQL
    const migrationPath = path.join(__dirname, '../migrations/add_trend_scoring_fields.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Step 1: Reading migration file...');
    console.log(`  Path: ${migrationPath}`);
    console.log(`  Size: ${migrationSQL.length} bytes`);
    console.log();

    // Split SQL into individual statements
    // Remove comments first, then split on semicolons
    const cleanedSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    const statements = cleanedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Step 2: Executing ${statements.length} SQL statements...`);
    console.log();

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`  [${i + 1}/${statements.length}] Executing...`);
      
      try {
        await db.execute(sql.raw(statement));
        console.log(`  ✓ Success`);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message && error.message.includes('already exists')) {
          console.log(`  ⚠ Already exists, skipping`);
        } else {
          throw error;
        }
      }
    }

    console.log();
    console.log('Step 3: Verifying schema changes...');

    // Verify new columns exist
    const tables = [
      'manufacturerDailyChallengeStats',
      'strainDailyChallengeStats',
      'productDailyChallengeStats',
      'pharmacyDailyChallengeStats',
    ];

    const newColumns = [
      'previousRank',
      'trendMultiplier',
      'consistencyScore',
      'velocityScore',
      'streakDays',
      'marketSharePercent',
    ];

    for (const table of tables) {
      console.log(`  Checking ${table}...`);
      
      for (const column of newColumns) {
        const result = await db.execute(sql.raw(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${table}' 
          AND column_name = '${column}'
        `));
        
        if (result.rows && result.rows.length > 0) {
          console.log(`    ✓ ${column}`);
        } else {
          console.log(`    ✗ ${column} NOT FOUND`);
        }
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log('MIGRATION COMPLETE');
    console.log('='.repeat(80));
    console.log();
    console.log('Next steps:');
    console.log('1. Run the aggregator with trend scoring enabled');
    console.log('2. Test the new scoring system with real data');
    console.log('3. Compare old vs new scores for validation');
    console.log('4. Update frontend to use new scoring breakdowns');
    console.log();

  } catch (error) {
    console.error();
    console.error('='.repeat(80));
    console.error('MIGRATION FAILED');
    console.error('='.repeat(80));
    console.error();
    console.error('Error:', error);
    console.error();
    process.exit(1);
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
