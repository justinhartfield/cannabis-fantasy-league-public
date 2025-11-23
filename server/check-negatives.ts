
import { getDb } from './db';
import { pharmacyWeeklyStats } from '../drizzle/schema';
import { lt, desc } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkNegativeScores() {
    const db = await getDb();
    if (!db) {
        console.error('Database not available');
        return;
    }

    const negativeStats = await db
        .select()
        .from(pharmacyWeeklyStats)
        .where(lt(pharmacyWeeklyStats.points, 0))
        .limit(5)
        .orderBy(desc(pharmacyWeeklyStats.week));

    console.log(`Found ${negativeStats.length} pharmacy stats with negative scores.`);

    for (const stat of negativeStats) {
        console.log(`\nPharmacy ID: ${stat.pharmacyId}, Week: ${stat.week}, Points: ${stat.points}`);
        console.log('Breakdown:', JSON.stringify(stat.breakdown, null, 2));
    }

    process.exit(0);
}

checkNegativeScores().catch(console.error);
