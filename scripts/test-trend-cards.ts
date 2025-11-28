/**
 * Test Trend Cards
 * 
 * Verifies that the Metabase trend cards are returning data
 * and shows what columns they have.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getMetabaseClient } from '../server/metabase';

const TREND_CARDS = {
  MANUFACTURERS: 1010,
  PHARMACIES: 1251,
  STRAINS: 1216,
  PRODUCTS: 1240,
};

async function testTrendCards() {
  console.log('Testing Trend Data Cards...\n');
  console.log('='.repeat(80));
  
  const metabase = getMetabaseClient();

  for (const [name, cardId] of Object.entries(TREND_CARDS)) {
    console.log(`\n${name} (Card ${cardId}):`);
    console.log('-'.repeat(40));
    
    try {
      const results = await metabase.executeCardQuery(cardId);
      console.log(`✅ Returned ${results.length} rows`);
      
      if (results.length > 0) {
        const columns = Object.keys(results[0]);
        console.log(`Columns: ${columns.join(', ')}`);
        
        // Show sample row
        console.log('\nSample row:');
        const sample = results[0];
        for (const [key, value] of Object.entries(sample)) {
          console.log(`  ${key}: ${value}`);
        }
        
        // Check for expected columns
        const expectedColumns = ['days1', 'Days1', '1d', 'days7', 'Days7', '7d', 'name', 'Name', 'entityName', 'EntityName'];
        const foundColumns = columns.filter(c => 
          expectedColumns.some(e => c.toLowerCase().includes(e.toLowerCase()) || e.toLowerCase().includes(c.toLowerCase()))
        );
        
        if (foundColumns.length === 0) {
          console.log('\n⚠️  WARNING: No expected column names found!');
          console.log('   Expected something like: days1, days7, name, entityName');
          console.log('   Got columns:', columns);
        } else {
          console.log(`\n✅ Found matching columns: ${foundColumns.join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`❌ Failed: ${error instanceof Error ? error.message : error}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('Test Complete');
}

testTrendCards().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});




