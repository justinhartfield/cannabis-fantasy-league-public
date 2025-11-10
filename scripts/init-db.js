#!/usr/bin/env node

/**
 * Database Initialization Script for Railway
 * 
 * This script runs automatically on Railway deployment to:
 * 1. Check if database tables exist
 * 2. Create tables if they don't exist
 * 3. Seed initial data if needed
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema.ts';

async function initDatabase() {
  console.log('[DB Init] Starting database initialization...');
  
  if (!process.env.DATABASE_URL) {
    console.error('[DB Init] ERROR: DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  let connection;
  
  try {
    // Parse DATABASE_URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    
    // Create connection
    connection = await mysql.createConnection({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port) || 3306,
      user: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.slice(1), // Remove leading slash
    });

    console.log('[DB Init] Connected to database');

    // Check if tables exist
    const [tables] = await connection.query(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'users'"
    );

    if (tables[0].count === 0) {
      console.log('[DB Init] Tables do not exist. Creating schema...');
      
      // Read and execute schema file
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const schemaPath = path.join(__dirname, '../drizzle/schema.sql');
      
      try {
        const schemaSQL = await fs.readFile(schemaPath, 'utf-8');
        
        // Split by semicolon and execute each statement
        const statements = schemaSQL
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const statement of statements) {
          await connection.query(statement);
        }
        
        console.log('[DB Init] Schema created successfully');
      } catch (error) {
        console.log('[DB Init] schema.sql not found, using Drizzle Kit...');
        
        // Alternative: Use drizzle-kit push
        const { execSync } = await import('child_process');
        try {
          execSync('npx drizzle-kit push:mysql --force', { stdio: 'inherit' });
          console.log('[DB Init] Schema pushed using Drizzle Kit');
        } catch (drizzleError) {
          console.error('[DB Init] Failed to push schema with Drizzle Kit:', drizzleError.message);
          throw drizzleError;
        }
      }
    } else {
      console.log('[DB Init] Tables already exist. Skipping schema creation.');
    }

    console.log('[DB Init] Database initialization complete!');
    
  } catch (error) {
    console.error('[DB Init] ERROR:', error.message);
    console.error('[DB Init] Stack:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run initialization
initDatabase().catch(error => {
  console.error('[DB Init] Fatal error:', error);
  process.exit(1);
});
