const axios = require('axios');

async function testPublicQuery() {
    const todayUuid = '14245995-f016-442b-ae44-2fbee6b3828b';
    const url = `https://bi.weed.de/api/public/card/${todayUuid}/query/json`;

    try {
        console.log(`Fetching public query: ${url}`);
        const response = await axios.get(url);
        const results = response.data;
        console.log(`Returned ${results.length} rows`);

        if (results.length > 0) {
            console.log('First row:', results[0]);
            console.log('Columns:', Object.keys(results[0]));
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testPublicQuery();
