import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

async function runMigration() {
  const sql = postgres(DATABASE_URL, {
    ssl: 'require'
  });
  
  try {
    console.log('Reading migration file...');
    const migrationPath = join(__dirname, '../drizzle/migrations/add_league_type.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    console.log(migrationSQL);
    
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
