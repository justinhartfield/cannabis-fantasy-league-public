/**
 * Run Daily Challenge Aggregation
 * 
 * This script triggers the daily challenge aggregation for a specific date.
 * It pulls real prescription/order data from Metabase and calculates scores
 * for all entity types (manufacturers, strains, products, pharmacies, brands).
 */

import { dailyChallengeAggregatorV2 } from '../server/dailyChallengeAggregatorV2';

async function runAggregation() {
  console.log('='.repeat(60));
  console.log('Daily Challenge Aggregation Script');
  console.log('='.repeat(60));
  console.log('');

  // Get dates to aggregate
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];

  console.log(`📅 Aggregating data for:`);
  console.log(`   - Today: ${todayString}`);
  console.log(`   - Yesterday: ${yesterdayString}`);
  console.log('');

  try {
    // Aggregate yesterday's data
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Aggregating Yesterday (${yesterdayString})`);
    console.log('='.repeat(60));
    const yesterdaySummary = await dailyChallengeAggregatorV2.aggregateForDate(yesterdayString);
    
    console.log('\n✅ Yesterday Summary:');
    console.log(`   - Manufacturers: ${yesterdaySummary.manufacturers.processed} processed, ${yesterdaySummary.manufacturers.skipped} skipped`);
    console.log(`   - Strains: ${yesterdaySummary.strains.processed} processed, ${yesterdaySummary.strains.skipped} skipped`);
    console.log(`   - Products: ${yesterdaySummary.products.processed} processed, ${yesterdaySummary.products.skipped} skipped`);
    console.log(`   - Pharmacies: ${yesterdaySummary.pharmacies.processed} processed, ${yesterdaySummary.pharmacies.skipped} skipped`);
    console.log(`   - Brands: ${yesterdaySummary.brands.processed} processed, ${yesterdaySummary.brands.skipped} skipped`);

    // Aggregate today's data
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Aggregating Today (${todayString})`);
    console.log('='.repeat(60));
    const todaySummary = await dailyChallengeAggregatorV2.aggregateForDate(todayString);
    
    console.log('\n✅ Today Summary:');
    console.log(`   - Manufacturers: ${todaySummary.manufacturers.processed} processed, ${todaySummary.manufacturers.skipped} skipped`);
    console.log(`   - Strains: ${todaySummary.strains.processed} processed, ${todaySummary.strains.skipped} skipped`);
    console.log(`   - Products: ${todaySummary.products.processed} processed, ${todaySummary.products.skipped} skipped`);
    console.log(`   - Pharmacies: ${todaySummary.pharmacies.processed} processed, ${todaySummary.pharmacies.skipped} skipped`);
    console.log(`   - Brands: ${todaySummary.brands.processed} processed, ${todaySummary.brands.skipped} skipped`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 Aggregation Complete!');
    console.log('='.repeat(60));
    console.log('\nProducts should now show today and yesterday scores in the draft board.');
    
  } catch (error) {
    console.error('\n❌ Aggregation failed:', error);
    throw error;
  }
}

// Run the script
runAggregation()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
