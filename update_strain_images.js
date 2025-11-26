// PostgreSQL UPDATE script for cannabis strain images
// Generated: 2025-11-26
// Total strains: 36
// Updated to use BunnyCDN URLs (cfls.b-cdn.net)
//
// Usage: node update_strain_images.js

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const strainImageMappings = [
  { name: "Ak 47", altNames: ["Ak47"], imageUrl: "https://cfls.b-cdn.net/strains/ak-47_YWstNDc=.png" },
  { name: "Amnesia Haze", imageUrl: "https://cfls.b-cdn.net/strains/amnesia-haze_YW1uZXNpYS1oYXpl.png" },
  { name: "Blue Dream", imageUrl: "https://cfls.b-cdn.net/strains/blue-dream_Ymx1ZS1kcmVhbQ==.png" },
  { name: "Blueberry", imageUrl: "https://cfls.b-cdn.net/strains/blueberry_Ymx1ZWJlcnJ5.png" },
  { name: "Bubba Kush", imageUrl: "https://cfls.b-cdn.net/strains/bubba-kush_YnViYmEta3VzaA==.png" },
  { name: "Chemdawg", imageUrl: "https://cfls.b-cdn.net/strains/chemdawg_Y2hlbWRhd2c=.png" },
  { name: "Cherry Pie", imageUrl: "https://cfls.b-cdn.net/strains/cherry-pie_Y2hlcnJ5LXBpZQ==.png" },
  { name: "Cookies", imageUrl: "https://cfls.b-cdn.net/strains/cookies_Y29va2llcw==.png" },
  { name: "Critical Kush", imageUrl: "https://cfls.b-cdn.net/strains/critical-kush_Y3JpdGljYWwta3VzaA==.png" },
  { name: "Do Si Dos", imageUrl: "https://cfls.b-cdn.net/strains/do-si-dos_ZG8tc2ktZG9z.png" },
  { name: "Durban Poison", imageUrl: "https://cfls.b-cdn.net/strains/durban-poison_ZHVyYmFuLXBvaXNvbg==.png" },
  { name: "Gelato", imageUrl: "https://cfls.b-cdn.net/strains/gelato_Z2VsYXRv.png" },
  { name: "Girl Scout Cookies", imageUrl: "https://cfls.b-cdn.net/strains/girl-scout-cookies_Z2lybC1zY291dC1jb29raWVz.png" },
  { name: "Gorilla Glue", imageUrl: "https://cfls.b-cdn.net/strains/gorilla-glue_Z29yaWxsYS1nbHVl.png" },
  { name: "Granddaddy Purple", imageUrl: "https://cfls.b-cdn.net/strains/granddaddy-purple_Z3JhbmRkYWRkeS1wdXJwbGU=.png" },
  { name: "Green Crack", imageUrl: "https://cfls.b-cdn.net/strains/green-crack_Z3JlZW4tY3JhY2s=.png" },
  { name: "Jack Herer", imageUrl: "https://cfls.b-cdn.net/strains/jack-herer_amFjay1oZXJlcg==.png" },
  { name: "Lemon Haze", imageUrl: "https://cfls.b-cdn.net/strains/lemon-haze_bGVtb24taGF6ZQ==.png" },
  { name: "Mac1", altNames: ["Mac 1"], imageUrl: "https://cfls.b-cdn.net/strains/mac1_bWFjMQ==.png" },
  { name: "Northern Lights", imageUrl: "https://cfls.b-cdn.net/strains/northern-lights_bm9ydGhlcm4tbGlnaHRz.png" },
  { name: "Og Kush", imageUrl: "https://cfls.b-cdn.net/strains/og-kush_b2cta3VzaA==.png" },
  { name: "Pineapple Express", imageUrl: "https://cfls.b-cdn.net/strains/pineapple-express_cGluZWFwcGxlLWV4cHJlc3M=.png" },
  { name: "Purple Haze", imageUrl: "https://cfls.b-cdn.net/strains/purple-haze_cHVycGxlLWhhemU=.png" },
  { name: "Purple Punch", imageUrl: "https://cfls.b-cdn.net/strains/purple-punch_cHVycGxlLXB1bmNo.png" },
  { name: "Runtz", imageUrl: "https://cfls.b-cdn.net/strains/runtz_cnVudHo=.png" },
  { name: "Skywalker Og", imageUrl: "https://cfls.b-cdn.net/strains/skywalker-og_c2t5d2Fsa2VyLW9n.png" },
  { name: "Sour Diesel", imageUrl: "https://cfls.b-cdn.net/strains/sour-diesel_c291ci1kaWVzZWw=.png" },
  { name: "Strawberry Cough", imageUrl: "https://cfls.b-cdn.net/strains/strawberry-cough_c3RyYXdiZXJyeS1jb3VnaA==.png" },
  { name: "Sunset Sherbet", imageUrl: "https://cfls.b-cdn.net/strains/sunset-sherbet_c3Vuc2V0LXNoZXJiZXQ=.png" },
  { name: "Super Lemon Haze", imageUrl: "https://cfls.b-cdn.net/strains/super-lemon-haze_c3VwZXItbGVtb24taGF6ZQ==.png" },
  { name: "Tangie", imageUrl: "https://cfls.b-cdn.net/strains/tangie_dGFuZ2ll.png" },
  { name: "Trainwreck", imageUrl: "https://cfls.b-cdn.net/strains/trainwreck_dHJhaW53cmVjaw==.png" },
  { name: "Wedding Cake", imageUrl: "https://cfls.b-cdn.net/strains/wedding-cake_d2VkZGluZy1jYWtl.png" },
  { name: "White Widow", imageUrl: "https://cfls.b-cdn.net/strains/white-widow_d2hpdGUtd2lkb3c=.png" },
  { name: "Zkittlez", imageUrl: "https://cfls.b-cdn.net/strains/zkittlez_emtpdHRsZXo=.png" },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Please ensure .env.local or .env contains DATABASE_URL');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  console.log('=== Updating Cannabis Strain Images to BunnyCDN ===\n');
  
  let totalUpdated = 0;
  let notFound = [];

  try {
    for (const mapping of strainImageMappings) {
      // Build list of names to match (including alt names)
      const namesToMatch = [mapping.name, ...(mapping.altNames || [])];
      
      // Update using exact name match first
      let result = await sql`
        UPDATE "cannabisStrains" 
        SET "imageUrl" = ${mapping.imageUrl}
        WHERE name = ANY(${namesToMatch})
        RETURNING id, name
      `;
      
      // If no exact match, try case-insensitive
      if (result.length === 0) {
        result = await sql`
          UPDATE "cannabisStrains" 
          SET "imageUrl" = ${mapping.imageUrl}
          WHERE LOWER(TRIM(name)) = LOWER(TRIM(${mapping.name}))
          RETURNING id, name
        `;
      }
      
      if (result.length > 0) {
        console.log(`✓ Updated: ${mapping.name} (${result.length} row(s))`);
        totalUpdated += result.length;
      } else {
        console.log(`✗ Not found: ${mapping.name}`);
        notFound.push(mapping.name);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Total strains updated: ${totalUpdated}`);
    
    if (notFound.length > 0) {
      console.log(`\nStrains not found in database (${notFound.length}):`);
      notFound.forEach(name => console.log(`  - ${name}`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

main();
