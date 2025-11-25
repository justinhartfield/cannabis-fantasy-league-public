
import { trpc } from '../client/src/lib/trpc'; // This won't work in node script easily without setup
// Instead let's use the service directly
import { getDataSyncServiceV3 } from '../server/services/dataSyncServiceV3';

async function runStatsSync() {
    console.log('Starting Daily Stats Sync...');
    const service = getDataSyncServiceV3();
    try {
        // Sync for today
        await service.syncDailyStats();
        console.log('Stats sync completed successfully.');
    } catch (err) {
        console.error('Stats sync failed:', err);
    }
    process.exit(0);
}

runStatsSync();
