/**
 * Test script for real Metabase data sync
 */

import { getDataSyncServiceV3 } from '../server/services/dataSyncServiceV3';

async function main() {
  const [, , dateArg] = process.argv;
  const targetDate = dateArg || '2025-11-16';

  console.log(`🚀 Testing REAL Metabase data sync for ${targetDate}...\n`);

  try {
    const service = getDataSyncServiceV3();
    await service.syncDailyStats(targetDate);
    console.log(`\n✅ Real data sync complete for ${targetDate}`);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Real data sync failed:', error);
    process.exit(1);
  }
}

main();
