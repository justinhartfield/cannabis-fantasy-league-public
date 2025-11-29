
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { getDb } from './server/db';
import { manufacturers } from './drizzle/schema';
import { isNotNull, eq } from 'drizzle-orm';

async function checkDescriptions() {
    const db = await getDb();
    if (!db) {
        console.error('Failed to connect to DB');
        process.exit(1);
    }

    const results = await db.select({ name: manufacturers.name, description: manufacturers.description })
        .from(manufacturers)
        .where(eq(manufacturers.name, 'Demecan'))
        .limit(1);

    console.log('Found descriptions:', results);
    process.exit(0);
}

checkDescriptions().catch(console.error);
