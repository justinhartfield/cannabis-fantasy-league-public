
import { DataSyncServiceV2 } from '../server/services/dataSyncService';

async function triggerProductSync() {
    console.log('Triggering product sync...');
    const service = new DataSyncServiceV2();

    try {
        await service.syncProducts();
        console.log('Product sync completed.');
    } catch (err) {
        console.error('Product sync failed:', err);
    }
    process.exit(0);
}

triggerProductSync();
