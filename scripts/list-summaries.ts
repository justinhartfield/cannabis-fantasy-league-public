import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from '../server/db';
import { dailySummaries } from '../drizzle/schema';
import { desc } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) {
        console.log('DB not available');
        return;
    }

    console.log('Fetching all daily summaries...');
    try {
        const summaries = await db
            .select({
                id: dailySummaries.id,
                date: dailySummaries.date,
                headline: dailySummaries.headline,
                createdAt: dailySummaries.createdAt
            })
            .from(dailySummaries)
            .orderBy(desc(dailySummaries.date));

        console.log(`Found ${summaries.length} summaries:`);
        summaries.forEach(s => {
            console.log(`[${s.date}] ID: ${s.id}, Created: ${s.createdAt}`);
            console.log(`   Headline: ${s.headline}`);
        });
    } catch (e) {
        console.error('Error querying summaries:', e);
    }
    process.exit(0);
}

main();
