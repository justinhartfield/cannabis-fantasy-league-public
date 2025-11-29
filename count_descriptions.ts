
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDb } from './server/db';
import { manufacturers, pharmacies, brands, strains } from './drizzle/schema';
import { isNotNull, count } from 'drizzle-orm';

async function countDescriptions() {
    const db = await getDb();
    if (!db) {
        console.error('Failed to connect to DB');
        process.exit(1);
    }

    const mfgCount = await db.select({ count: count() }).from(manufacturers).where(isNotNull(manufacturers.description));
    const pharmCount = await db.select({ count: count() }).from(pharmacies).where(isNotNull(pharmacies.description));
    const brandCount = await db.select({ count: count() }).from(brands).where(isNotNull(brands.description));
    const strainCount = await db.select({ count: count() }).from(strains).where(isNotNull(strains.description));

    console.log('Description Counts:');
    console.log('Manufacturers:', mfgCount[0].count);
    console.log('Pharmacies:', pharmCount[0].count);
    console.log('Brands:', brandCount[0].count);
    console.log('Strains:', strainCount[0].count);

    process.exit(0);
}

countDescriptions().catch(console.error);
