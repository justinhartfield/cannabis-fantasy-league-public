
import { getMetabaseClient } from '../server/metabase';

async function debugPaginationTest() {
    console.log('Testing pagination...');
    const client = getMetabaseClient();

    try {
        console.log('Fetching page 1 (limit 5)...');
        const page1 = await client.fetchStrains({ limit: 5 });
        console.log('Page 1 IDs:', page1.map(s => s.metabaseId));

        console.log('Fetching page 2 (limit 5, page 2)...');
        // Try 'page'
        const page2_page = await client.fetchStrains({ limit: 5, page: 2 });
        console.log('Page 2 (page: 2) IDs:', page2_page.map(s => s.metabaseId));

        console.log('Fetching page 2 (limit 5, offset 5)...');
        // Try 'offset'
        const page2_offset = await client.fetchStrains({ limit: 5, offset: 5 });
        console.log('Page 2 (offset: 5) IDs:', page2_offset.map(s => s.metabaseId));

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

debugPaginationTest();
