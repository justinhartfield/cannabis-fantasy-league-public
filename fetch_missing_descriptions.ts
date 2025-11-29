
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDb } from './server/db';
import { manufacturers, pharmacies, brands, strains } from './drizzle/schema';
import { isNull } from 'drizzle-orm';

async function fetchMissing() {
    const db = await getDb();
    if (!db) {
        console.error('Failed to connect to DB');
        process.exit(1);
    }

    const missingManufacturers = await db.select({ id: manufacturers.id, name: manufacturers.name }).from(manufacturers).where(isNull(manufacturers.description)).limit(20);
    const missingPharmacies = await db.select({ id: pharmacies.id, name: pharmacies.name }).from(pharmacies).where(isNull(pharmacies.description)).limit(20);
    const missingBrands = await db.select({ id: brands.id, name: brands.name }).from(brands).where(isNull(brands.description)).limit(20);
    const missingStrains = await db.select({ id: strains.id, name: strains.name }).from(strains).where(isNull(strains.description)).limit(20);

    console.log(JSON.stringify({
        manufacturers: missingManufacturers,
        pharmacies: missingPharmacies,
        brands: missingBrands,
        strains: missingStrains
    }, null, 2));

    process.exit(0);
}

fetchMissing().catch(console.error);
