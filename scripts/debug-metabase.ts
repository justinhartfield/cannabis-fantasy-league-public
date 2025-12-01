import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getMetabaseClient } from '../server/metabase';

async function main() {
    const client = getMetabaseClient();
    const dateStr = '2025-11-30';

    console.log(`Testing Metabase Card 1267 for ${dateStr}...`);
    try {
        const rows = await client.executeCardQuery(1267, { date: dateStr });
        console.log(`Success! Returned ${rows.length} rows.`);
        if (rows.length > 0) {
            console.log('Sample row:', rows[0]);
        }
    } catch (error: any) {
        console.error('Query failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        }
    }
    process.exit(0);
}

main();
