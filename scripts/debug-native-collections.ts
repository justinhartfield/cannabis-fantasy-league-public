
import { getMetabaseClient } from '../server/metabase';

async function debugCollections() {
    console.log('Listing collections...');
    const client = getMetabaseClient();

    try {
        const query = `db.getCollectionNames()`;
        const rows = await client.executeNativeQuery(query);

        console.log(`Collections:`, rows);

    } catch (err) {
        console.error('Native query failed:', err);
    }
    process.exit(0);
}

debugCollections();
