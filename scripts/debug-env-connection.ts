import dotenv from 'dotenv';
import path from 'path';

// Force reload .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const result = dotenv.config({ path: envPath, override: true });

if (result.error) {
    console.error('Error loading .env.local:', result.error);
}

console.log('Loaded env vars:', Object.keys(result.parsed || {}));
console.log('METABASE_API_KEY length:', process.env.METABASE_API_KEY?.length);
console.log('METABASE_URL:', process.env.METABASE_URL);

import { getMetabaseClient } from '../server/metabase';

async function main() {
    const client = getMetabaseClient();
    console.log('Fetching Card 1267...');
    try {
        const rows = await client.executeCardQuery(1267, {});
        console.log(`Success! Returned ${rows.length} rows.`);
    } catch (error: any) {
        console.error('Query failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
        }
    }
    process.exit(0);
}

main();
