// PostgreSQL UPDATE script for manufacturer logos
// Generated: 2025-11-26
// Updates manufacturers with BunnyCDN logo URLs

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// Manufacturer logo mappings - includes both name-based and ID-based updates
const manufacturerLogosByName = [
  // Fix for manufacturers showing blue placeholders
  { name: "Peace Naturals", logoUrl: "https://cfls.b-cdn.net/manufacturers/peace-naturals_cGVhY2UtbmF0dXJhbHM=.png" },
  { name: "enua", logoUrl: "https://cfls.b-cdn.net/manufacturers/enua_ZW51YQ==.png" },
  { name: "enua Pharma", logoUrl: "https://cfls.b-cdn.net/manufacturers/enua_ZW51YQ==.png" },
  { name: "Remexian Pharma", logoUrl: "https://cfls.b-cdn.net/manufacturers/remexian-pharma_cmVtZXhpYW4tcGhhcm1h.png" },
  { name: "Weeco", logoUrl: "https://cfls.b-cdn.net/manufacturers/weeco_d2VlY28=.png" },
  { name: "luvo", logoUrl: "https://cfls.b-cdn.net/manufacturers/luvo_bHV2bw==.png" },
  { name: "mediproCan", logoUrl: "https://cfls.b-cdn.net/manufacturers/mediprocan_bWVkaXByb2Nhbg==.png" },
  { name: "Drapalin", logoUrl: "https://cfls.b-cdn.net/manufacturers/drapalin_ZHJhcGFsaW4=.png" },
  { name: "Vayamed", logoUrl: "https://cfls.b-cdn.net/manufacturers/vayamed_dmF5YW1lZA==.png" },
];

// Batch 1 - ID-based updates from update_manufacturers_batch1.sql
const manufacturerLogosById = [
  { id: 1, logoUrl: "https://cfls.b-cdn.net/manufacturers/vonblüte_Vk9OYkzDnFRF.png" },
  { id: 2, logoUrl: "https://cfls.b-cdn.net/manufacturers/green-house-seed-co_R3JlZW4gSG91c2UgU2VlZCBDby4.png" },
  { id: 3, logoUrl: "https://cfls.b-cdn.net/manufacturers/hanf-im-glück_SGFuZiBJbSBHbMO8Y2s.png" },
  { id: 9, logoUrl: "https://cfls.b-cdn.net/manufacturers/nevernot_bmV2ZXJub3Q.png" },
  { id: 10, logoUrl: "https://cfls.b-cdn.net/manufacturers/grove-bags_R3JvdmUgQmFncw.png" },
  { id: 14, logoUrl: "https://cfls.b-cdn.net/manufacturers/baast_QmFhc3Q.png" },
  { id: 16, logoUrl: "https://cfls.b-cdn.net/manufacturers/hazefly_SGF6ZWZseQ.png" },
  { id: 17, logoUrl: "https://cfls.b-cdn.net/manufacturers/smowe_U01PV0U.png" },
  { id: 18, logoUrl: "https://cfls.b-cdn.net/manufacturers/cannafleur_Q2FubmFmbGV1cg.png" },
  { id: 19, logoUrl: "https://cfls.b-cdn.net/manufacturers/weedo_V2VlZG8.png" },
  { id: 20, logoUrl: "https://cfls.b-cdn.net/manufacturers/hempcrew_SGVtcGNyZXc.png" },
  { id: 21, logoUrl: "https://cfls.b-cdn.net/manufacturers/malantis_TWFsYW50aXM.png" },
  { id: 22, logoUrl: "https://cfls.b-cdn.net/manufacturers/seedstockers_U2VlZHN0b2NrZXJz.png" },
  { id: 24, logoUrl: "https://cfls.b-cdn.net/manufacturers/enua-pharma_ZW51YSBQaGFybWE.png" },
  { id: 26, logoUrl: "https://cfls.b-cdn.net/manufacturers/growhub_R3Jvd0h1Yg.png" },
  { id: 27, logoUrl: "https://cfls.b-cdn.net/manufacturers/spliffers_U3BsaWZmZXJz.png" },
  { id: 28, logoUrl: "https://cfls.b-cdn.net/manufacturers/weed-brand_V2VlZCBCcmFuZA.png" },
  { id: 29, logoUrl: "https://cfls.b-cdn.net/manufacturers/focus-v_Rm9jdXMgVg.png" },
  { id: 30, logoUrl: "https://cfls.b-cdn.net/manufacturers/weed_V2VlZA.png" },
  { id: 32, logoUrl: "https://cfls.b-cdn.net/manufacturers/g13-labs_RzEzIExhYnM.png" },
  { id: 33, logoUrl: "https://cfls.b-cdn.net/manufacturers/pax_UEFY.png" },
  { id: 34, logoUrl: "https://cfls.b-cdn.net/manufacturers/alweeda_QWx3ZWVkYQ.png" },
  { id: 35, logoUrl: "https://cfls.b-cdn.net/manufacturers/royal-queen-seeds_Um95YWwgUXVlZW4gU2VlZHM.png" },
  { id: 36, logoUrl: "https://cfls.b-cdn.net/manufacturers/kailar_S2FpbGFy.png" },
  { id: 37, logoUrl: "https://cfls.b-cdn.net/manufacturers/storz-bickel_U1RPUlogJiBCSUNLRUw.png" },
  { id: 38, logoUrl: "https://cfls.b-cdn.net/manufacturers/greenvend-test-nora-fröbisch-weedde_R3JlZW5WZW5kIChURVNUIE5vcmEgRnLDtmJpc2NoIHdlZWQuZGUp.png" },
  { id: 40, logoUrl: "https://cfls.b-cdn.net/manufacturers/noids_Tk9JRFM.png" },
  { id: 41, logoUrl: "https://cfls.b-cdn.net/manufacturers/test-brand-zsolt_VGVzdCBCcmFuZCBac29sdA.png" },
  { id: 43, logoUrl: "https://cfls.b-cdn.net/manufacturers/cannasseur-club_Q2FubmFzc2V1ciBDbHVi.png" },
  { id: 44, logoUrl: "https://cfls.b-cdn.net/manufacturers/partnerbrandsname_UGFydG5lckJyYW5kc05hbWU.png" },
  { id: 46, logoUrl: "https://cfls.b-cdn.net/manufacturers/vapesndabs_VmFwZXMnbidEYWJz.png" },
  { id: 47, logoUrl: "https://cfls.b-cdn.net/manufacturers/skunky-monkey_U2t1bmt5IE1vbmtleQ.png" },
  { id: 49, logoUrl: "https://cfls.b-cdn.net/manufacturers/tyson-20-deutschland_VHlzb24gMi4wIERldXRzY2hsYW5k.png" },
  { id: 50, logoUrl: "https://cfls.b-cdn.net/manufacturers/etos-extraordinaryshit_ZXRvcyogLSBleHRyYW9yZGluYXJ5c2hpdA.png" },
  { id: 51, logoUrl: "https://cfls.b-cdn.net/manufacturers/red-lion-cannabis-social-club-ev_UmVkIExpb24gQ2FubmFiaXMgU29jaWFsIENsdWIgZS5WLg.png" },
  { id: 52, logoUrl: "https://cfls.b-cdn.net/manufacturers/easyhomegrowing_RWFzeUhvbWVHcm93aW5n.png" },
  { id: 53, logoUrl: "https://cfls.b-cdn.net/manufacturers/kannavi_S2FubmF2aQ.png" },
  { id: 55, logoUrl: "https://cfls.b-cdn.net/manufacturers/dutch-passion_RHV0Y2ggUGFzc2lvbg.png" },
  { id: 56, logoUrl: "https://cfls.b-cdn.net/manufacturers/inhale-vaporizers_SU5IQUxFIFZhcG9yaXplcnM.png" },
  { id: 57, logoUrl: "https://cfls.b-cdn.net/manufacturers/hemper_SEVNUEVS.png" },
  { id: 59, logoUrl: "https://cfls.b-cdn.net/manufacturers/treez-tools_VHJlZXogVG9vbHM.png" },
  { id: 60, logoUrl: "https://cfls.b-cdn.net/manufacturers/treez-club_VHJlZXogQ2x1Yg.png" },
  { id: 61, logoUrl: "https://cfls.b-cdn.net/manufacturers/original-kavatza_T3JpZ2luYWwgS2F2YXR6YQ.png" },
  { id: 62, logoUrl: "https://cfls.b-cdn.net/manufacturers/seedstockers-plants_U2VlZHN0b2NrZXJzIFBsYW50cw.png" },
  { id: 64, logoUrl: "https://cfls.b-cdn.net/manufacturers/four-20-origins_Rm91ciAyMCBPcmlnaW5z.png" },
  { id: 65, logoUrl: "https://cfls.b-cdn.net/manufacturers/smoking_U21va2luZw.png" },
  { id: 66, logoUrl: "https://cfls.b-cdn.net/manufacturers/plantalytix_UGxhbnRhbHl0aXg.png" },
  { id: 67, logoUrl: "https://cfls.b-cdn.net/manufacturers/marigold_TWFyaUdvbGQ.png" },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  console.log('=== Updating Manufacturer Logos to BunnyCDN ===\n');
  
  let totalUpdatedByName = 0;
  let totalUpdatedById = 0;

  try {
    // Update by name first (for the blue placeholder fixes)
    console.log('--- Updating by Name ---');
    for (const mapping of manufacturerLogosByName) {
      const result = await sql`
        UPDATE manufacturers 
        SET "logoUrl" = ${mapping.logoUrl}
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(${mapping.name}))
        RETURNING id, name
      `;
      
      if (result.length > 0) {
        console.log(`✓ Updated: ${mapping.name} (${result.length} row(s))`);
        totalUpdatedByName += result.length;
      } else {
        console.log(`✗ Not found: ${mapping.name}`);
      }
    }

    // Update by ID (batch updates)
    console.log('\n--- Updating by ID ---');
    for (const mapping of manufacturerLogosById) {
      const result = await sql`
        UPDATE manufacturers 
        SET "logoUrl" = ${mapping.logoUrl}
        WHERE id = ${mapping.id}
        RETURNING id, name
      `;
      
      if (result.length > 0) {
        console.log(`✓ Updated ID ${mapping.id}: ${result[0].name}`);
        totalUpdatedById += result.length;
      } else {
        console.log(`✗ ID ${mapping.id} not found`);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Updated by name: ${totalUpdatedByName}`);
    console.log(`Updated by ID: ${totalUpdatedById}`);
    console.log(`Total updated: ${totalUpdatedByName + totalUpdatedById}`);

    // Verify some samples
    console.log('\n=== Verification (sample) ===');
    const samples = await sql`
      SELECT id, name, "logoUrl" 
      FROM manufacturers 
      WHERE "logoUrl" LIKE '%cfls.b-cdn.net%'
      ORDER BY id
      LIMIT 15
    `;
    
    console.log(`Manufacturers with BunnyCDN logos: ${samples.length}+`);
    samples.forEach(m => {
      console.log(`  ✓ ID ${m.id}: ${m.name}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

main();

