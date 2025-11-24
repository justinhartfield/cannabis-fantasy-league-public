import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const METABASE_URL = process.env.METABASE_URL || 'https://bi.weed.de';
const METABASE_API_KEY = process.env.METABASE_API_KEY || '';

async function listTables() {
    try {
        console.log('Fetching tables from Metabase...');
        // Try to list tables for database 2
        const response = await axios.get(
            `${METABASE_URL}/api/database/2/tables`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-KEY': METABASE_API_KEY,
                },
                timeout: 10000
            }
        );

        console.log(`Found ${response.data.length} tables:`);
        response.data.forEach(table => {
            console.log(`[${table.id}] ${table.name} (${table.display_name})`);
        });

    } catch (error) {
        console.error('Error fetching tables:', error.response?.data || error.message);
        // Fallback: try /api/table
        try {
            console.log('Retrying with /api/table...');
            const response = await axios.get(
                `${METABASE_URL}/api/table`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-API-KEY': METABASE_API_KEY,
                    },
                    timeout: 10000
                }
            );
            console.log(`Found ${response.data.length} tables:`);
            response.data.forEach(table => {
                console.log(`[${table.id}] ${table.name} (${table.display_name}) - DB: ${table.db_id}`);
            });
        } catch (err2) {
            console.error('Error fetching tables (fallback):', err2.response?.data || err2.message);
        }
    }
}

listTables();
