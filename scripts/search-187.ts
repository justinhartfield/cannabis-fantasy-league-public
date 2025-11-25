
import { getDb } from '../server/db';
import { brands, strains } from '../drizzle/schema';
import { ilike } from 'drizzle-orm';

async function search187() {
    const db = await getDb();

    console.log('Searching Brands for "187"...');
    const brd = await db.select().from(brands).where(ilike(brands.name, '%187%'));
    console.log(brd.map(b => b.name));

    console.log('Searching Products (Strains) for "187"...');
    const prod = await db.select().from(strains).where(ilike(strains.name, '%187%'));
    console.log(prod.map(p => p.name));

    process.exit(0);
}

search187().catch(console.error);
