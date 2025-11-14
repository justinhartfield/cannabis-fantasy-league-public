/**
 * Metabase Feasibility Test
 * 
 * Tests whether daily stats aggregation is feasible by:
 * 1. Connecting to Metabase
 * 2. Querying recent Prescription data
 * 3. Verifying data exists for daily aggregation
 * 4. Testing MongoDB aggregation queries
 */

import { getMetabaseClient } from './metabase';

async function testMetabaseFeasibility() {
  console.log('='.repeat(60));
  console.log('METABASE FEASIBILITY TEST');
  console.log('='.repeat(60));
  console.log('');

  const metabase = getMetabaseClient();

  try {
    // Test 1: Check if we can query recent prescriptions
    console.log('Test 1: Querying recent prescriptions...');
    const recentPrescriptions = await metabase.executeNativeQuery(
      'db.getCollection("Prescription").find({}).sort({createdAt: -1}).limit(5)'
    );
    
    if (recentPrescriptions.length === 0) {
      console.log('❌ FAIL: No prescriptions found in database');
      return false;
    }
    
    console.log(`✅ PASS: Found ${recentPrescriptions.length} recent prescriptions`);
    console.log('Sample prescription:', JSON.stringify(recentPrescriptions[0], null, 2));
    console.log('');

    // Test 2: Check if prescriptions have date fields
    console.log('Test 2: Checking date fields...');
    const firstPrescription = recentPrescriptions[0];
    const hasCreatedAt = firstPrescription && firstPrescription.createdAt;
    
    if (!hasCreatedAt) {
      console.log('❌ FAIL: Prescriptions missing createdAt field');
      return false;
    }
    
    console.log(`✅ PASS: Prescriptions have createdAt field`);
    console.log(`Latest prescription date: ${firstPrescription.createdAt}`);
    console.log('');

    // Test 3: Count prescriptions for today
    console.log('Test 3: Counting prescriptions for today...');
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(`${today}T00:00:00Z`).toISOString();
    const todayEnd = new Date(`${today}T23:59:59Z`).toISOString();
    
    const todayCount = await metabase.executeAggregation('Prescription', [
      {
        $match: {
          createdAt: {
            $gte: { $date: todayStart },
            $lte: { $date: todayEnd }
          }
        }
      },
      {
        $count: 'total'
      }
    ]);
    
    const count = todayCount[0]?.total || 0;
    console.log(`✅ Found ${count} prescriptions for today (${today})`);
    
    if (count === 0) {
      console.log('⚠️  WARNING: No prescriptions for today. Trying yesterday...');
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const yesterdayStart = new Date(`${yesterdayStr}T00:00:00Z`).toISOString();
      const yesterdayEnd = new Date(`${yesterdayStr}T23:59:59Z`).toISOString();
      
      const yesterdayCount = await metabase.executeAggregation('Prescription', [
        {
          $match: {
            createdAt: {
              $gte: { $date: yesterdayStart },
              $lte: { $date: yesterdayEnd }
            }
          }
        },
        {
          $count: 'total'
        }
      ]);
      
      const yCount = yesterdayCount[0]?.total || 0;
      console.log(`Found ${yCount} prescriptions for yesterday (${yesterdayStr})`);
      
      if (yCount === 0) {
        console.log('❌ FAIL: No recent prescription data available');
        return false;
      }
    }
    console.log('');

    // Test 4: Test aggregation by manufacturer
    console.log('Test 4: Testing manufacturer aggregation...');
    const manufacturerAgg = await metabase.executeAggregation('Prescription', [
      {
        $match: {
          createdAt: {
            $gte: { $date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() }
          }
        }
      },
      {
        $lookup: {
          from: 'Product',
          localField: 'product',
          foreignField: '_id',
          as: 'productData'
        }
      },
      { $unwind: '$productData' },
      {
        $group: {
          _id: '$productData.manufacturer',
          totalQuantity: { $sum: '$quantity' },
          prescriptionCount: { $sum: 1 }
        }
      },
      { $limit: 5 }
    ]);
    
    if (manufacturerAgg.length === 0) {
      console.log('❌ FAIL: Manufacturer aggregation returned no results');
      return false;
    }
    
    console.log(`✅ PASS: Manufacturer aggregation successful`);
    console.log(`Found ${manufacturerAgg.length} manufacturers with activity in past week`);
    console.log('Sample:', JSON.stringify(manufacturerAgg[0], null, 2));
    console.log('');

    // Test 5: Check if Product collection has required fields
    console.log('Test 5: Checking Product schema...');
    const sampleProduct = await metabase.executeNativeQuery(
      'db.getCollection("Product").findOne({})'
    );
    
    if (!sampleProduct || sampleProduct.length === 0) {
      console.log('❌ FAIL: No products found');
      return false;
    }
    
    const product = sampleProduct[0];
    const hasManufacturer = product && product.manufacturer;
    const hasPharmacy = product && product.pharmacy;
    const hasStrain = product && product.strain;
    
    console.log(`Product has manufacturer field: ${hasManufacturer ? '✅' : '❌'}`);
    console.log(`Product has pharmacy field: ${hasPharmacy ? '✅' : '❌'}`);
    console.log(`Product has strain field: ${hasStrain ? '✅' : '❌'}`);
    console.log('');

    // Final summary
    console.log('='.repeat(60));
    console.log('FEASIBILITY TEST RESULTS');
    console.log('='.repeat(60));
    console.log('✅ Metabase connection: SUCCESS');
    console.log('✅ Prescription data exists: SUCCESS');
    console.log('✅ Date filtering works: SUCCESS');
    console.log('✅ Aggregation queries work: SUCCESS');
    console.log('✅ Product relationships exist: SUCCESS');
    console.log('');
    console.log('🎉 CONCLUSION: Daily stats aggregation is FEASIBLE!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Implement full aggregation queries for all entity types');
    console.log('2. Map Metabase IDs to local database IDs');
    console.log('3. Test with real data and verify accuracy');
    console.log('4. Deploy and run backfill for historical dates');
    console.log('='.repeat(60));
    
    return true;

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ FEASIBILITY TEST FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error);
    
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
    
    console.error('');
    console.error('Possible issues:');
    console.error('- Metabase API key not configured');
    console.error('- Metabase URL incorrect');
    console.error('- Network connectivity issues');
    console.error('- MongoDB query syntax errors');
    console.error('- Database permissions');
    
    return false;
  }
}

// Run the test
testMetabaseFeasibility()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
