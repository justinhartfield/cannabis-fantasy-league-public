import { MetabaseClient } from './server/metabase';
import dotenv from 'dotenv';

dotenv.config();

async function testPublicQuery() {
    const client = new MetabaseClient();
    const todayUuid = '4468dfb0-8031-4e99-9115-0c31bd9373bb';

    try {
        console.log(`Fetching public query: ${todayUuid}`);
        const results = await client.executePublicQuery(todayUuid);
        console.log(`Returned ${results.length} rows`);

        if (results.length > 0) {
            console.log('First row:', results[0]);
            console.log('Columns:', Object.keys(results[0]));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testPublicQuery();
