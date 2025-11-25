
import { getDb } from '../server/db';
import { strains } from '../drizzle/schema';
import { like, eq } from 'drizzle-orm';

async function check187Products() {
    console.log('Checking for 187 products in DB...');
    const db = await getDb();

    try {
        const products = await db.select().from(strains).where(eq(strains.manufacturerName, '187 SWEEDZ'));
        console.log(`Found ${products.length} products for manufacturer '187 SWEEDZ'.`);
        products.forEach(p => console.log(`- ${p.name}`));

        // Also check for '187 Marry Jane' just in case
        const oldProducts = await db.select().from(strains).where(eq(strains.manufacturerName, '187 Marry Jane'));
        console.log(`Found ${oldProducts.length} products for manufacturer '187 Marry Jane'.`);

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

check187Products();
