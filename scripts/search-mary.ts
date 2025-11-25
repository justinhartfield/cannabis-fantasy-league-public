
import { getDb } from '../server/db';
import { manufacturers, brands } from '../drizzle/schema';
import { ilike } from 'drizzle-orm';

async function searchMary() {
    const db = await getDb();

    console.log('Searching Manufacturers for "Mary"...');
    const mfg = await db.select().from(manufacturers).where(ilike(manufacturers.name, '%Mary%'));
    console.log(mfg.map(m => m.name));

    console.log('Searching Brands for "Mary"...');
    const brd = await db.select().from(brands).where(ilike(brands.name, '%Mary%'));
    console.log(brd.map(b => b.name));

    process.exit(0);
}

searchMary().catch(console.error);
