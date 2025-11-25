
import { getMetabaseClient } from '../server/metabase';

async function debugNativeQuery() {
    console.log('Testing native query for Products...');
    const client = getMetabaseClient();

    try {
        // Try to guess the collection name "Product"
        const query = `db.getCollection("Product").find({}).limit(5000)`;
        const rows = await client.executeNativeQuery(query);

        console.log(`Native query returned ${rows.length} rows.`);

        if (rows.length > 0) {
            console.log('First row keys:', Object.keys(rows[0]));
            // Check for 187
            const missing = rows.filter((r: any) => {
                const str = JSON.stringify(r);
                return str.includes('187') && (str.includes('Cannabisflower') || str.includes('SWEEDZ'));
            });
            console.log(`Found ${missing.length} '187' items in native query results.`);
            if (missing.length > 0) {
                console.log('Sample item:', JSON.stringify(missing[0], null, 2));
            }
        }

    } catch (err) {
        console.error('Native query failed:', err);
    }
    process.exit(0);
}

debugNativeQuery();
