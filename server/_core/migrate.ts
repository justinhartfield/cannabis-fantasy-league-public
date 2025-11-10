import * as dbModule from '../db';
const db = (dbModule as any).db;
import { sql } from 'drizzle-orm';

export async function runMigrations() {
  try {
    console.log('[Migration] Checking database schema...');
    
    // Check if tables exist by trying to query one
    try {
      await db.execute(sql`SELECT 1 FROM users LIMIT 1`);
      console.log('[Migration] Database schema already exists. Skipping migration.');
      return true;
    } catch (error) {
      console.log('[Migration] Tables do not exist. Running migrations...');
    }
    
    // If tables don't exist, run drizzle-kit push
    const { execSync } = await import('child_process');
    
    console.log('[Migration] Running drizzle-kit push...');
    execSync('npx drizzle-kit push', {
      stdio: 'inherit',
      env: { ...process.env }
    });
    
    console.log('[Migration] ✅ Database migration completed successfully!');
    return true;
    
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    // Don't throw - let the server start anyway
    // The error will be caught when trying to use the database
    return false;
  }
}
