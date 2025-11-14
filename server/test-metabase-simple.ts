/**
 * Simple Metabase Test
 * Tests basic connectivity and data structure
 */

import { getMetabaseClient } from './metabase';

async function testSimple() {
  console.log('Testing Metabase connection...\n');
  
  const metabase = getMetabaseClient();

  try {
    // Test 1: Try the existing fetchBrands method (we know this works)
    console.log('Test 1: Fetching brands using existing method...');
    const brands = await metabase.fetchBrands();
    console.log(`✅ Found ${brands.length} brands`);
    if (brands.length > 0) {
      console.log('Sample brand:', brands[0]);
    }
    console.log('');

    // Test 2: Try native query with simpler syntax
    console.log('Test 2: Testing native query with count...');
    try {
      const result = await metabase.executeNativeQuery('[{"$count": "total"}]');
      console.log('Result:', result);
    } catch (error) {
      console.log('Native query failed:', error instanceof Error ? error.message : error);
    }
    console.log('');

    // Test 3: Try MBQL query for Prescription table
    console.log('Test 3: Trying MBQL query for table 21 (Prescription)...');
    try {
      const mbqlResult = await (metabase as any).executeQuery({
        'source-table': 21,
        limit: 5,
      });
      console.log(`✅ MBQL query returned ${mbqlResult.length} rows`);
      if (mbqlResult.length > 0) {
        console.log('Sample row:', mbqlResult[0]);
      }
    } catch (error) {
      console.log('MBQL query failed:', error instanceof Error ? error.message : error);
    }
    console.log('');

    // Test 4: Check what tables are available
    console.log('Test 4: Checking available tables...');
    const tableIds = [5, 6, 7, 16, 18, 21, 24, 36, 42];
    const tableNames = ['Product', 'Pharmacy', 'Favorite', 'Strain', 'Manufacturer', 'Prescription', 'Pharmacy2', 'Brand', 'Product2'];
    
    for (let i = 0; i < tableIds.length; i++) {
      try {
        const result = await (metabase as any).executeQuery({
          'source-table': tableIds[i],
          limit: 1,
        });
        console.log(`✅ Table ${tableIds[i]} (${tableNames[i]}): ${result.length} rows returned`);
      } catch (error) {
        console.log(`❌ Table ${tableIds[i]} (${tableNames[i]}): Failed`);
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSimple().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
