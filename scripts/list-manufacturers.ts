
import { getDb } from '../server/db';
import { manufacturers } from '../drizzle/schema';

async function listManufacturers() {
    const db = await getDb();
    const all = await db.select().from(manufacturers);
    console.log(`Total manufacturers: ${all.length}`);
    console.log(all.map(m => m.name).sort());
    process.exit(0);
}

listManufacturers().catch(console.error);
