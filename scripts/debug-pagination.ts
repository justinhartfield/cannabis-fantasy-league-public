
import { getMetabaseClient } from '../server/metabase';

async function debugPagination() {
    console.log('Testing pagination for Products...');
    const client = getMetabaseClient();

    try {
        // Try fetching with offset 2000
        // We need to access executeQuery, but it's private.
        // We can use fetchStrains but we need to modify it to accept offset or modify the file.
        // Since we can't easily modify the file just for this script without editing it,
        // let's assume we will edit metabase.ts to test this.

        // But wait, I can't call private methods.
        // I will modify metabase.ts to expose a temporary public method or just modify fetchStrains to take an offset?
        // No, that's messy.

        // Let's modify metabase.ts to log the result of a query with offset 2000.
        // I will modify fetchStrains to use offset 2000 temporarily.

        console.log('Please run the modified fetchStrains via debug-product-sync.ts');

    } catch (err) {
        console.error(err);
    }
}

// debugPagination(); 
