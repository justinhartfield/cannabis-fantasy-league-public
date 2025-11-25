
import { getDailyStatsScheduler } from '../server/dailyStatsScheduler';

async function runChallengeStatsSync() {
    console.log('Starting Daily Challenge Stats Sync (V2)...');
    const scheduler = getDailyStatsScheduler();
    const today = new Date().toISOString().split('T')[0];

    try {
        await scheduler.aggregateForDate(today);
        console.log('Challenge stats sync completed successfully.');
    } catch (err) {
        console.error('Challenge stats sync failed:', err);
    }
    process.exit(0);
}

runChallengeStatsSync();
