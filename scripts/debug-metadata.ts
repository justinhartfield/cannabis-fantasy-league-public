
import { getMetabaseClient } from '../server/metabase';

async function debugMetadata() {
    console.log('Fetching metadata for Product table (42)...');
    const client = getMetabaseClient();

    try {
        const metadata = await client.getTableMetadata(42);
        if (metadata && metadata.fields) {
            const nameField = metadata.fields.find((f: any) => f.name === 'name' || f.display_name === 'Name');
            console.log('Name Field:', nameField);

            const manufacturerField = metadata.fields.find((f: any) => f.name === 'manufacturer' || f.display_name === 'Manufacturer');
            console.log('Manufacturer Field:', manufacturerField);
        } else {
            console.log('No fields found in metadata');
        }
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

debugMetadata();
