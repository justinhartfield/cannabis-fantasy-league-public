
import { getDataSyncServiceV2 } from '../server/services/dataSyncService';

async function runSync() {
    console.log('Starting Manual Manufacturer Sync...');
    const service = getDataSyncServiceV2();
    try {
        await service.syncManufacturers();
        console.log('Sync completed successfully.');
    } catch (err) {
        console.error('Sync failed:', err);
    }
    process.exit(0);
}

runSync();
