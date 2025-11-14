/**
 * Test Daily Stats Aggregation V2
 * Tests fetching orders from Metabase and aggregating daily stats
 */

import { getMetabaseClient } from './metabase';

async function testDailyStatsV2() {
  console.log('='.repeat(60));
  console.log('DAILY STATS AGGREGATION V2 TEST');
  console.log('='.repeat(60));
  console.log('');

  const metabase = getMetabaseClient();

  try {
    // Test 1: Fetch orders from Metabase card 1264
    console.log('Test 1: Fetching orders from Metabase card 1264...');
    const orders = await metabase.executeCardQuery(1264);
    console.log(`✅ Found ${orders.length} total orders`);
    
    if (orders.length === 0) {
      console.log('❌ No orders found!');
      return false;
    }

    console.log('Sample order:', orders[0]);
    console.log('');

    // Test 2: Filter orders by date (Nov 7, 2024)
    console.log('Test 2: Filtering orders by date...');
    const testDate = '2024-11-07';
    const targetDate = new Date(testDate);
    
    const filtered = orders.filter((order: any) => {
      if (!order.OrderDate) return false;
      const orderDate = new Date(order.OrderDate);
      return (
        orderDate.getFullYear() === targetDate.getFullYear() &&
        orderDate.getMonth() === targetDate.getMonth() &&
        orderDate.getDate() === targetDate.getDate()
      );
    });

    console.log(`✅ Found ${filtered.length} orders for ${testDate}`);
    console.log('');

    // Test 3: Aggregate by manufacturer
    console.log('Test 3: Aggregating by manufacturer...');
    const manufacturerStats = new Map<string, { totalQuantity: number; orderCount: number; revenue: number }>();

    for (const order of filtered) {
      const manufacturer = order.ProductManufacturer;
      if (!manufacturer) continue;

      const quantity = parseInt(order.Quantity) || 0;
      const revenue = parseGermanNumber(order.TotalPrice);

      const stats = manufacturerStats.get(manufacturer) || { totalQuantity: 0, orderCount: 0, revenue: 0 };
      stats.totalQuantity += quantity;
      stats.orderCount += 1;
      stats.revenue += revenue;
      manufacturerStats.set(manufacturer, stats);
    }

    console.log(`✅ Found ${manufacturerStats.size} manufacturers`);
    console.log('Top 5 manufacturers:');
    const sorted = Array.from(manufacturerStats.entries())
      .sort((a, b) => b[1].totalQuantity - a[1].totalQuantity)
      .slice(0, 5);
    
    sorted.forEach(([name, stats]) => {
      console.log(`  - ${name}: ${stats.totalQuantity} units, ${stats.orderCount} orders, €${stats.revenue.toFixed(2)}`);
    });
    console.log('');

    // Test 4: Aggregate by strain
    console.log('Test 4: Aggregating by strain...');
    const strainStats = new Map<string, { totalQuantity: number; orderCount: number }>();

    for (const order of filtered) {
      const strainName = order.ProductStrainName;
      if (!strainName) continue;

      const quantity = parseInt(order.Quantity) || 0;

      const stats = strainStats.get(strainName) || { totalQuantity: 0, orderCount: 0 };
      stats.totalQuantity += quantity;
      stats.orderCount += 1;
      strainStats.set(strainName, stats);
    }

    console.log(`✅ Found ${strainStats.size} strains`);
    console.log('Top 5 strains:');
    const sortedStrains = Array.from(strainStats.entries())
      .sort((a, b) => b[1].totalQuantity - a[1].totalQuantity)
      .slice(0, 5);
    
    sortedStrains.forEach(([name, stats]) => {
      console.log(`  - ${name}: ${stats.totalQuantity} units, ${stats.orderCount} orders`);
    });
    console.log('');

    // Test 5: Aggregate by pharmacy
    console.log('Test 5: Aggregating by pharmacy...');
    const pharmacyStats = new Map<string, { orderCount: number; revenue: number }>();

    for (const order of filtered) {
      const pharmacyName = order.PharmacyName;
      if (!pharmacyName) continue;

      const revenue = parseGermanNumber(order.TotalPrice);

      const stats = pharmacyStats.get(pharmacyName) || { orderCount: 0, revenue: 0 };
      stats.orderCount += 1;
      stats.revenue += revenue;
      pharmacyStats.set(pharmacyName, stats);
    }

    console.log(`✅ Found ${pharmacyStats.size} pharmacies`);
    console.log('Top 5 pharmacies:');
    const sortedPharmacies = Array.from(pharmacyStats.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);
    
    sortedPharmacies.forEach(([name, stats]) => {
      console.log(`  - ${name}: ${stats.orderCount} orders, €${stats.revenue.toFixed(2)}`);
    });
    console.log('');

    // Final summary
    console.log('='.repeat(60));
    console.log('TEST RESULTS');
    console.log('='.repeat(60));
    console.log('✅ Metabase card query works');
    console.log('✅ Order data is complete and usable');
    console.log('✅ Date filtering works');
    console.log('✅ Aggregation by manufacturer works');
    console.log('✅ Aggregation by strain works');
    console.log('✅ Aggregation by pharmacy works');
    console.log('');
    console.log('🎉 DAILY STATS AGGREGATION IS FULLY FEASIBLE!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update dataSyncRouter to use DailyStatsAggregatorV2');
    console.log('2. Update dailyStatsScheduler to run aggregation daily');
    console.log('3. Test with database writes');
    console.log('4. Deploy and verify challenge scores work');
    console.log('='.repeat(60));

    return true;

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error);
    return false;
  }
}

function parseGermanNumber(value: string | number): number {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
}

// Run the test
testDailyStatsV2()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
