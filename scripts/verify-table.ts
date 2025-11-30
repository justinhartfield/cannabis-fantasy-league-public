import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) {
        console.log('DB not available');
        return;
    }
    try {
        const result = await db.execute(sql`SELECT to_regclass('public."dailySummaries"')`);
        console.log('Table exists:', result[0].to_regclass !== null);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

main();
