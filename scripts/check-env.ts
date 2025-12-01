import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try loading from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading .env.local from:', envPath);

if (fs.existsSync(envPath)) {
    console.log('.env.local exists.');
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    const apiKeyLine = lines.find(l => l.trim().startsWith('METABASE_API_KEY'));
    if (apiKeyLine) {
        console.log('Found METABASE_API_KEY line in file.');
        // Don't print the full key for security, just length and first few chars
        const parts = apiKeyLine.split('=');
        if (parts.length > 1) {
            const val = parts.slice(1).join('=').trim();
            console.log(`Key length in file: ${val.length}`);
            console.log(`Key starts with: ${val.substring(0, 5)}...`);
        } else {
            console.log('Line format seems wrong (no = sign).');
        }
    } else {
        console.log('METABASE_API_KEY not found in .env.local file content.');
    }
} else {
    console.log('.env.local does NOT exist.');
}

dotenv.config({ path: '.env.local' });

console.log('\nProcess Env Check:');
if (process.env.METABASE_API_KEY) {
    console.log('METABASE_API_KEY is set in process.env');
    console.log(`Length: ${process.env.METABASE_API_KEY.length}`);
} else {
    console.log('METABASE_API_KEY is NOT set in process.env');
}
