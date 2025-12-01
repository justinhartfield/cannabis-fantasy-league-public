import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from '../server/db';
import { dailySummaries } from '../drizzle/schema';
import { desc } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) {
        console.log('DB not available');
        return;
    }

    const summary = await db
        .select()
        .from(dailySummaries)
        .orderBy(desc(dailySummaries.date))
        .limit(1);

    if (summary.length > 0) {
        console.log('Headline:', summary[0].headline);
        console.log('\nContent Preview:');
        console.log(summary[0].content);

        console.log('\nStats Snapshot:');
        const stats = summary[0].stats as any;
        console.log('Top Manufacturers:', stats.topManufacturers?.map((m: any) => `${m.name} (${m.id})`));
        console.log('Top Strains:', stats.topStrains?.map((s: any) => `${s.name} (${s.id})`));
        console.log('Top Pharmacies:', stats.topPharmacies?.map((p: any) => `${p.name} (${p.id})`));
        console.log('Top Brands:', stats.topBrands?.map((b: any) => `${b.name} (${b.id})`));
    } else {
        console.log('No summary found.');
    }
    process.exit(0);
}

main();
