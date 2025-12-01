import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { dailyChallengeAggregatorV2 } from '../server/dailyChallengeAggregatorV2';
import { getDailySummaryService } from '../server/services/dailySummaryService';

async function main() {
    const dateStr = '2025-11-30'; // Yesterday

    console.log(`[1/2] Triggering stats aggregation for ${dateStr}...`);
    try {
        const summary = await dailyChallengeAggregatorV2.aggregateForDate(dateStr);
        console.log('Aggregation Summary:', JSON.stringify(summary, null, 2));
    } catch (error) {
        console.error('Aggregation failed. Please check your Metabase credentials in .env.local');
        console.error(error);
        process.exit(1);
    }

    console.log(`\n[2/2] Generating Daily Summary for ${dateStr}...`);
    try {
        const result = await getDailySummaryService().generateDailySummary(dateStr);
        console.log('Success!');
        console.log('Headline:', result.headline);
    } catch (error) {
        console.error('Summary generation failed:', error);
        process.exit(1);
    }

    process.exit(0);
}

main();
