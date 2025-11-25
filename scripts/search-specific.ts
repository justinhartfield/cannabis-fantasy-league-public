
import { getDb } from '../server/db';
import { manufacturers } from '../drizzle/schema';
import { ilike, or } from 'drizzle-orm';

async function searchSpecific() {
    const db = await getDb();

    console.log('Searching Manufacturers for "187" or "Marry"...');
    const mfg = await db.select().from(manufacturers).where(
        or(
            ilike(manufacturers.name, '%187%'),
            ilike(manufacturers.name, '%Marry%')
        )
    );
    console.log(mfg.map(m => m.name));

    process.exit(0);
}

searchSpecific().catch(console.error);
