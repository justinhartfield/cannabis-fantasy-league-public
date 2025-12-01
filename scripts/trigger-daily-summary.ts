import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });
// import { getDailySummaryService } from '../server/services/dailySummaryService';

async function main() {
    const date = new Date();
    date.setDate(date.getDate() - 1); // Yesterday
    const dateStr = date.toISOString().split('T')[0];

    console.log(`Generating summary for ${dateStr}...`);
    try {
        const { getDailySummaryService } = await import('../server/services/dailySummaryService');
        const result = await getDailySummaryService().generateDailySummary(dateStr);
        console.log('Success!');
        console.log('Headline:', result.headline);
    } catch (error) {
        console.error('Failed:', error);
    }
    process.exit(0);
}

main();
