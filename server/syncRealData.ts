/**
 * Sync Real Data from Metabase
 * 
 * This script fetches real data from weed.de Metabase and populates the database.
 * Run this to replace test data with actual market data.
 */

import { DataSyncService } from './dataSync';
import { getCannabisStrainStatsCalculator } from './cannabisStrainStatsCalculator';

async function syncRealData() {
  console.log('='.repeat(60));
  console.log('Cannabis Fantasy League - Real Data Sync');
  console.log('='.repeat(60));
  console.log('');

  const syncService = new DataSyncService();

  try {
    // Step 1: Sync Manufacturers
    console.log('Step 1/5: Syncing Manufacturers...');
    await syncService.syncManufacturers();
    console.log('✅ Manufacturers synced successfully\n');

    // Step 2: Sync Cannabis Strains (genetics)
    console.log('Step 2/5: Syncing Cannabis Strains...');
    await syncService.syncCannabisStrains();
    console.log('✅ Cannabis strains synced successfully\n');

    // Step 3: Sync Products (pharmaceutical products)
    console.log('Step 3/5: Syncing Products...');
    await syncService.syncStrains();
    console.log('✅ Products synced successfully\n');

    // Step 4: Sync Pharmacies
    console.log('Step 4/5: Syncing Pharmacies...');
    await syncService.syncPharmacies();
    console.log('✅ Pharmacies synced successfully\n');

    // Step 5: Calculate Cannabis Strain Weekly Stats
    console.log('Step 5/5: Calculating Cannabis Strain Weekly Stats...');
    const statsCalculator = getCannabisStrainStatsCalculator();
    const now = new Date();
    const year = now.getFullYear();
    const week = getWeekNumber(now);
    
    await statsCalculator.calculateWeeklyStats(year, week);
    console.log('✅ Cannabis strain stats calculated successfully\n');

    console.log('='.repeat(60));
    console.log('✅ Real Data Sync Complete!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log('- Manufacturers synced from Metabase');
    console.log('- Cannabis strains synced from Metabase');
    console.log('- Products synced from Metabase');
    console.log('- Pharmacies synced from Metabase');
    console.log(`- Weekly stats calculated for ${year}-W${week}`);
    console.log('');
    console.log('The database is now populated with real weed.de data!');
    
  } catch (error) {
    console.error('');
    console.error('❌ Real Data Sync Failed!');
    console.error('Error:', error);
    process.exit(1);
  }
}

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Run the sync
syncRealData()
  .then(() => {
    console.log('Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
