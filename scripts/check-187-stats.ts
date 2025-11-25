
import { getDb } from '../server/db';
import { manufacturers, manufacturerDailyChallengeStats } from '../drizzle/schema';
import { eq, ilike } from 'drizzle-orm';

async function checkStats() {
    const db = await getDb();

    const mfg = await db.query.manufacturers.findFirst({
        where: ilike(manufacturers.name, '%187 SWEEDZ%')
    });

    if (!mfg) {
        console.log('187 SWEEDZ not found in manufacturers');
        return;
    }

    console.log(`Found Manufacturer: ${mfg.name} (ID: ${mfg.id})`);

    const stats = await db.select().from(manufacturerDailyChallengeStats)
        .where(eq(manufacturerDailyChallengeStats.manufacturerId, mfg.id));

    console.log(`Found ${stats.length} stats entries.`);
    if (stats.length > 0) {
        console.log('Latest stats:', stats[stats.length - 1]);
    }

    process.exit(0);
}

checkStats().catch(console.error);
