import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getMetabaseClient } from '../server/metabase';

async function main() {
    const client = getMetabaseClient();

    console.log('Fetching Card 1267 (no params)...');
    try {
        // Execute without parameters to see raw data
        const rows = await client.executeCardQuery(1267, {});
        console.log(`Returned ${rows.length} rows.`);

        if (rows.length > 0) {
            console.log('Sample Row Keys:', Object.keys(rows[0]));
            console.log('Sample Row:', JSON.stringify(rows[0], null, 2));

            // Check for date columns
            const dateKeys = Object.keys(rows[0]).filter(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time') || k.toLowerCase().includes('day'));
            console.log('Potential Date Columns:', dateKeys);

            // Check for Nov 30 and Dec 1 data
            const nov30 = rows.filter((r: any) => JSON.stringify(r).includes('2025-11-30'));
            const dec1 = rows.filter((r: any) => JSON.stringify(r).includes('2025-12-01'));

            console.log(`Rows matching 2025-11-30: ${nov30.length}`);
            console.log(`Rows matching 2025-12-01: ${dec1.length}`);
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
