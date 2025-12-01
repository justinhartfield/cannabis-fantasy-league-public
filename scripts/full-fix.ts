import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { dailyChallengeAggregatorV2 } from '../server/dailyChallengeAggregatorV2';
import { getDailySummaryService } from '../server/services/dailySummaryService';
import { getDb } from '../server/db';
import { manufacturerDailyStats } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) {
        console.error('DB not available');
        process.exit(1);
    }

    // 1. Fix Nov 30 (Yesterday)
    console.log('\n=== Fixing Nov 30 (Yesterday) ===');
    const dateNov30 = '2025-11-30';

    // Check if stats exist
    const statsNov30 = await db.select().from(manufacturerDailyStats).where(eq(manufacturerDailyStats.statDate, dateNov30));
    if (statsNov30.length === 0) {
        console.log(`Stats missing for ${dateNov30}. Aggregating...`);
        try {
            await dailyChallengeAggregatorV2.aggregateForDate(dateNov30);
            console.log('Aggregation complete.');
        } catch (e) {
            console.error('Aggregation failed (Check Metabase Auth):', e);
            process.exit(1);
        }
    } else {
        console.log(`Stats already exist for ${dateNov30} (${statsNov30.length} mfg records).`);
    }

    // Always regenerate summary to fix hallucinations
    console.log(`Regenerating Daily Summary for ${dateNov30}...`);
    try {
        const result = await getDailySummaryService().generateDailySummary(dateNov30);
        console.log('Summary generated!');
        console.log('Headline:', result.headline);
    } catch (e) {
        console.error('Summary generation failed:', e);
    }

    // 2. Fix Dec 1 (Today)
    console.log('\n=== Fixing Dec 1 (Today) ===');
    const dateDec1 = '2025-12-01';

    console.log(`Aggregating stats for ${dateDec1}...`);
    try {
        await dailyChallengeAggregatorV2.aggregateForDate(dateDec1);
        console.log('Aggregation complete.');
    } catch (e) {
        console.error('Aggregation failed:', e);
    }

    console.log('\nAll fixes applied. Please check the Dashboard and Leaderboard.');
    process.exit(0);
}

main();
