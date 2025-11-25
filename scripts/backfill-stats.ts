import dotenv from 'dotenv';
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDailyStatsAggregator } from '../server/dailyStatsAggregator';
import { subDays, format } from 'date-fns';

async function backfillStats() {
    const aggregator = getDailyStatsAggregator();
    const daysToBackfill = 30; // Adjust as needed

    console.log(`Starting backfill for the last ${daysToBackfill} days...`);

    for (let i = daysToBackfill; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateString = format(date, 'yyyy-MM-dd');

        console.log(`Processing ${dateString}...`);
        try {
            await aggregator.aggregateAllStats(dateString);
            console.log(`Successfully backfilled ${dateString}`);
        } catch (error) {
            console.error(`Failed to backfill ${dateString}:`, error);
        }

        // Add a small delay to be nice to Metabase/DB
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Backfill complete!');
    process.exit(0);
}

backfillStats().catch(console.error);
