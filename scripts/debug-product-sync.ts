
import { getMetabaseClient } from '../server/metabase';

async function debugProductSync() {
    console.log('Fetching raw products from Metabase...');
    const client = getMetabaseClient();

    // We need to access the private executeQuery or just use fetchStrains and log inside?
    // Since executeQuery is private, let's use a public method or just modify the client temporarily?
    // Actually, we can just use the same logic as fetchStrains but log the raw rows.
    // But we can't easily access private methods.
    // Let's try to use fetchStrains and see if we can filter the result.

    try {
        // We'll use the public fetchStrains but we might need to increase the limit in the actual file if that's the issue.
        // But first let's see if fetchStrains returns them at all.
        const strains = await client.fetchStrains();
        console.log(`Fetched ${strains.length} strains.`);

        const missing = strains.filter(s => s.name.includes('187') || s.manufacturer.includes('187'));
        console.log('Found 187 items in fetchStrains result:', missing.map(s => `${s.name} (${s.manufacturer})`));

        if (missing.length === 0) {
            console.log('No 187 items found in fetchStrains result. The issue is likely in the query limit or filtering inside fetchStrains.');
        }

    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

debugProductSync();
