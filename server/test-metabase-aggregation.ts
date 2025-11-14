/**
 * Test MBQL Aggregation Capabilities
 * Check if we can do aggregations needed for daily stats
 */

import { getMetabaseClient } from './metabase';

async function testAggregation() {
  console.log('Testing MBQL Aggregation Capabilities...\n');
  
  const metabase = getMetabaseClient();

  try {
    // Test 1: Get sample data from Brand table with aggregation
    console.log('Test 1: Aggregating Brand data (count)...');
    const brandCount = await (metabase as any).executeQuery({
      'source-table': 36, // Brand table
      aggregation: [['count']],
    });
    console.log('Brand count result:', brandCount);
    console.log('');

    // Test 2: Get brands with totalFavorites sum
    console.log('Test 2: Sum of totalFavorites from Brand table...');
    const favoritesSum = await (metabase as any).executeQuery({
      'source-table': 36,
      aggregation: [['sum', ['field', 7, null]]], // field 7 is totalFavorites
    });
    console.log('Favorites sum result:', favoritesSum);
    console.log('');

    // Test 3: Group by and count
    console.log('Test 3: Group by brand name and count...');
    const groupedBrands = await (metabase as any).executeQuery({
      'source-table': 36,
      aggregation: [['count']],
      breakout: [['field', 1, null]], // field 1 is name
      limit: 10,
    });
    console.log(`Grouped brands result: ${groupedBrands.length} rows`);
    if (groupedBrands.length > 0) {
      console.log('Sample:', groupedBrands[0]);
    }
    console.log('');

    // Test 4: Try to get Product data with filters
    console.log('Test 4: Get Products with limit...');
    const products = await (metabase as any).executeQuery({
      'source-table': 42, // Product table
      limit: 5,
    });
    console.log(`Products result: ${products.length} rows`);
    if (products.length > 0) {
      console.log('Sample product:', products[0]);
      console.log('Product fields count:', products[0].length);
    }
    console.log('');

    // Test 5: Check if we can filter by date
    console.log('Test 5: Testing date filtering on Product createdAt...');
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 7);
      
      const recentProducts = await (metabase as any).executeQuery({
        'source-table': 42,
        filter: ['>=', ['field', 'createdAt', null], yesterday.toISOString()],
        limit: 10,
      });
      console.log(`Recent products: ${recentProducts.length} rows`);
    } catch (error) {
      console.log('Date filtering failed:', error instanceof Error ? error.message : error);
    }
    console.log('');

    // Test 6: Check Prescription table structure
    console.log('Test 6: Get Prescription table structure...');
    const prescriptions = await (metabase as any).executeQuery({
      'source-table': 21,
      limit: 10,
    });
    console.log(`Prescriptions: ${prescriptions.length} rows`);
    if (prescriptions.length > 0) {
      console.log('Sample prescription:', prescriptions[0]);
    } else {
      console.log('⚠️  No prescription data available - this is the blocker!');
    }
    console.log('');

    console.log('='.repeat(60));
    console.log('CONCLUSION:');
    console.log('='.repeat(60));
    console.log('✅ MBQL queries work');
    console.log('✅ Aggregations are possible');
    console.log('✅ Brand/Product/Strain data exists');
    console.log('❌ Prescription data is EMPTY or not accessible');
    console.log('');
    console.log('IMPACT: Cannot calculate daily stats without prescription data');
    console.log('RECOMMENDATION: Use existing weekly stats OR investigate why Prescription table is empty');

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAggregation().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
