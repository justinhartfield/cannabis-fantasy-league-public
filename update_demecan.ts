
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDb } from './server/db';
import { manufacturers } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function updateDemecan() {
    const db = await getDb();
    if (!db) {
        console.error('Failed to connect to DB');
        process.exit(1);
    }

    const description = `
        <p><strong>Demecan</strong> is a leading German manufacturer of medical cannabis.</p>
        <p>As the only independent German company that covers the entire value chain for medical cannabis from cultivation to processing and distribution, Demecan guarantees the highest quality standards and supply security for patients in Germany.</p>
        <p>Located in Ebersbach near Dresden, their facility is one of the largest indoor cannabis production sites in Europe.</p>
    `;

    await db.update(manufacturers)
        .set({ description })
        .where(eq(manufacturers.name, 'Demecan'));

    console.log('Updated Demecan description.');
    process.exit(0);
}

updateDemecan().catch(console.error);
