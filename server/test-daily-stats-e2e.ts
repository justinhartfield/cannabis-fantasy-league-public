/**
 * End-to-End Test for Daily Stats Aggregation
 * Tests the complete flow including database writes
 */

import { dailyStatsAggregator } from './dailyStatsAggregator-v2';
import { db } from './_core/db';

async function testE2E() {
  console.log('='.repeat(60));
  console.log('DAILY STATS AGGREGATION - END-TO-END TEST');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Test date: November 7, 2024 (we know this has data)
    const testDate = '2024-11-07';
    
    console.log(`Testing aggregation for ${testDate}...`);
    console.log('');

    // Run the aggregation
    await dailyStatsAggregator.aggregateForDate(testDate);

    console.log('');
    console.log('Aggregation complete! Verifying database writes...');
    console.log('');

    // Verify manufacturer stats
    console.log('Checking manufacturer daily stats...');
    const manufacturerStats = await db.query.manufacturerDailyStats.findMany({
      where: (stats, { eq }) => eq(stats.statDate, testDate),
      with: {
        manufacturer: true,
      },
      limit: 5,
    });

    if (manufacturerStats.length > 0) {
      console.log(`✅ Found ${manufacturerStats.length} manufacturer stats`);
      manufacturerStats.forEach((stat) => {
        console.log(`  - ${stat.manufacturer.name}: ${stat.salesVolume} units, ${stat.orderCount} orders, €${stat.revenue}`);
      });
    } else {
      console.log('❌ No manufacturer stats found in database');
    }
    console.log('');

    // Verify strain stats
    console.log('Checking strain daily stats...');
    const strainStats = await db.query.strainDailyStats.findMany({
      where: (stats, { eq }) => eq(stats.statDate, testDate),
      with: {
        strain: true,
      },
      limit: 5,
    });

    if (strainStats.length > 0) {
      console.log(`✅ Found ${strainStats.length} strain stats`);
      strainStats.forEach((stat) => {
        console.log(`  - ${stat.strain.name}: ${stat.salesVolume} units, ${stat.orderCount} orders`);
      });
    } else {
      console.log('❌ No strain stats found in database');
    }
    console.log('');

    // Verify pharmacy stats
    console.log('Checking pharmacy daily stats...');
    const pharmacyStats = await db.query.pharmacyDailyStats.findMany({
      where: (stats, { eq }) => eq(stats.statDate, testDate),
      with: {
        pharmacy: true,
      },
      limit: 5,
    });

    if (pharmacyStats.length > 0) {
      console.log(`✅ Found ${pharmacyStats.length} pharmacy stats`);
      pharmacyStats.forEach((stat) => {
        console.log(`  - ${stat.pharmacy.name}: ${stat.orderCount} orders, €${stat.revenue}`);
      });
    } else {
      console.log('❌ No pharmacy stats found in database');
    }
    console.log('');

    // Verify product stats
    console.log('Checking product daily stats...');
    const productStats = await db.query.productDailyStats.findMany({
      where: (stats, { eq }) => eq(stats.statDate, testDate),
      with: {
        product: true,
      },
      limit: 5,
    });

    if (productStats.length > 0) {
      console.log(`✅ Found ${productStats.length} product stats`);
      productStats.forEach((stat) => {
        console.log(`  - ${stat.product.name}: ${stat.salesVolume} units, ${stat.orderCount} orders`);
      });
    } else {
      console.log('❌ No product stats found in database');
    }
    console.log('');

    // Final summary
    console.log('='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    
    const allStatsFound = 
      manufacturerStats.length > 0 &&
      strainStats.length > 0 &&
      pharmacyStats.length > 0 &&
      productStats.length > 0;

    if (allStatsFound) {
      console.log('✅ ALL TESTS PASSED');
      console.log('✅ Daily stats aggregation is working correctly');
      console.log('✅ Database writes are successful');
      console.log('');
      console.log('Next steps:');
      console.log('1. Commit and push changes');
      console.log('2. Deploy to production');
      console.log('3. Run aggregation for challenge dates');
      console.log('4. Verify challenge scores display correctly');
    } else {
      console.log('⚠️  PARTIAL SUCCESS');
      console.log('Some entity types have no stats. This could be due to:');
      console.log('- Missing entities in local database');
      console.log('- Metabase ID mapping issues');
      console.log('- Data quality issues');
    }
    
    console.log('='.repeat(60));

    return allStatsFound;

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    
    return false;
  }
}

// Run the test
testE2E()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
