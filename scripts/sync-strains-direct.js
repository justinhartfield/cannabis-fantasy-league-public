/**
 * Direct Strains Sync Script
 * Directly syncs cannabis strains without relying on exported functions
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { eq, sql } from 'drizzle-orm';

const { Pool } = pg;

// Metabase configuration
const METABASE_URL = process.env.METABASE_URL || 'https://bi.weed.de';
const CANNABIS_STRAIN_TABLE_ID = 16; // Cannabis strains table ID

async function fetchStrainsFromMetabase() {
  console.log('📡 Fetching strains from Metabase...');
  
  const apiKey = process.env.METABASE_API_KEY;
  if (!apiKey) {
    throw new Error('METABASE_API_KEY environment variable not set');
  }

  const response = await fetch(`${METABASE_URL}/api/table/${CANNABIS_STRAIN_TABLE_ID}/query`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      limit: 10000,
    }),
  });

  if (!response.ok) {
    throw new Error(`Metabase API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`✅ Fetched ${data.data.rows.length} strains from Metabase`);
  
  return data.data.rows;
}

function normalizeStrainName(name) {
  if (!name) return name;
  
  // Replace underscores with spaces and capitalize each word
  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

async function syncStrains() {
  console.log('🌿 Starting cannabis strains sync...');
  
  try {
    // Connect to database
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    const db = drizzle(pool);
    
    // Fetch strains from Metabase
    const rows = await fetchStrainsFromMetabase();
    
    let synced = 0;
    let errors = 0;
    
    for (const row of rows) {
      try {
        const strainData = {
          metabaseId: row[0],
          name: normalizeStrainName(row[1]),
          slug: row[2],
          type: row[3],
          description: row[4],
          effects: row[5],
          flavors: row[6],
          terpenes: row[7],
          thcMin: row[8],
          thcMax: row[9],
          cbdMin: row[10],
          cbdMax: row[11],
          pharmaceuticalProductCount: row[12] || 0,
        };
        
        // Insert or update using raw SQL
        await db.execute(sql`
          INSERT INTO "cannabisStrains" (
            "metabaseId", name, slug, type, description, effects, flavors, terpenes,
            "thcMin", "thcMax", "cbdMin", "cbdMax", "pharmaceuticalProductCount"
          ) VALUES (
            ${strainData.metabaseId}, ${strainData.name}, ${strainData.slug}, ${strainData.type},
            ${strainData.description}, ${strainData.effects}, ${strainData.flavors}, ${strainData.terpenes},
            ${strainData.thcMin}, ${strainData.thcMax}, ${strainData.cbdMin}, ${strainData.cbdMax},
            ${strainData.pharmaceuticalProductCount}
          )
          ON CONFLICT ("metabaseId") DO UPDATE SET
            name = EXCLUDED.name,
            slug = EXCLUDED.slug,
            type = EXCLUDED.type,
            description = EXCLUDED.description,
            effects = EXCLUDED.effects,
            flavors = EXCLUDED.flavors,
            terpenes = EXCLUDED.terpenes,
            "thcMin" = EXCLUDED."thcMin",
            "thcMax" = EXCLUDED."thcMax",
            "cbdMin" = EXCLUDED."cbdMin",
            "cbdMax" = EXCLUDED."cbdMax",
            "pharmaceuticalProductCount" = EXCLUDED."pharmaceuticalProductCount",
            "updatedAt" = CURRENT_TIMESTAMP
        `);
        
        synced++;
        
        if (synced % 10 === 0) {
          console.log(`  Synced ${synced}/${rows.length} strains...`);
        }
      } catch (error) {
        console.error(`  Error syncing strain ${row[1]}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\n✅ Sync complete!`);
    console.log(`  - Synced: ${synced} strains`);
    console.log(`  - Errors: ${errors}`);
    
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Strains sync failed:', error);
    process.exit(1);
  }
}

syncStrains();
