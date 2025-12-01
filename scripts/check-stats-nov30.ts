import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from '../server/db';
import { manufacturerDailyStats } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) {
        console.log('DB not available');
        return;
    }

    // Check for Nov 30 (Yesterday relative to Dec 1)
    // Or just check specifically for '2025-11-30' to be sure
    const dateStr = '2025-11-30';
    console.log(`Checking stats for ${dateStr}...`);

    try {
        const stats = await db
            .select()
            .from(manufacturerDailyStats)
            .where(eq(manufacturerDailyStats.statDate, dateStr))
            .limit(5);

        console.log(`Found ${stats.length} manufacturer stats records for ${dateStr}.`);
    } catch (e) {
        console.error('Error querying stats:', e);
    }
    process.exit(0);
}

main();
