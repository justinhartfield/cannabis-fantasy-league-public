/**
 * Manual Strains Sync Script
 * Run this in Render Shell to sync cannabis strains data
 */

import { getDataSyncService } from '../dist/index.js';

async function syncStrains() {
  console.log('🌿 Starting cannabis strains sync...');
  
  try {
    const syncService = getDataSyncService();
    await syncService.syncStrains();
    console.log('✅ Cannabis strains synced successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Strains sync failed:', error);
    process.exit(1);
  }
}

syncStrains();
