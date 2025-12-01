import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from '../server/db';
import { dailySummaries, manufacturerDailyStats } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) {
        console.log('DB not available');
        return;
    }

    const dateStr = '2025-11-30';
    console.log(`Inspecting data for ${dateStr}...`);

    // 1. Check Daily Summary Stats
    const summary = await db
        .select()
        .from(dailySummaries)
        .where(eq(dailySummaries.date, dateStr))
        .limit(1);

    if (summary.length > 0) {
        console.log('\n[Daily Summary Found]');
        console.log('Headline:', summary[0].headline);
        const stats = summary[0].stats as any;
        console.log('Stats Object Keys:', Object.keys(stats));
        console.log('Top Manufacturers Count:', stats.topManufacturers?.length || 0);
        console.log('Top Strains Count:', stats.topStrains?.length || 0);
        if (stats.topManufacturers?.length === 0) {
            console.log('WARNING: topManufacturers array is empty in summary!');
        }
    } else {
        console.log('\n[!] No Daily Summary found for', dateStr);
    }

    // 2. Check Raw Stats
    const mfgStats = await db
        .select()
        .from(manufacturerDailyStats)
        .where(eq(manufacturerDailyStats.statDate, dateStr));

    console.log(`\n[Raw Stats] Found ${mfgStats.length} manufacturer stats rows for ${dateStr}`);

    process.exit(0);
}

main();
