import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);


import { dailyChallengeAggregatorV2 } from '../server/dailyChallengeAggregatorV2';
import { getDb } from '../server/db';
import { brandDailyChallengeStats } from '../drizzle/dailyChallengeSchema';
import { desc, eq } from 'drizzle-orm';

async function verifyBrandScoring() {
    const db = await getDb();
    const today = new Date().toISOString().split('T')[0];

    console.log(`Running aggregation for ${today}...`);

    try {
        // Run aggregation
        const summary = await dailyChallengeAggregatorV2.aggregateForDate(today, { brandsOnly: true });
        console.log('Aggregation complete:', summary.brands);

        // Check results in DB for the aggregated brands
        // We expect Treez Tools, SMOWE, Hanf Im Glück
        const targetBrands = ['Treez Tools', 'SMOWE', 'Hanf Im Glück'];

        // Need to import brands table to join
        const { brands } = await import('../drizzle/schema');

        const results = await db
            .select({
                name: brands.name,
                totalPoints: brandDailyChallengeStats.totalPoints,
                totalRatings: brandDailyChallengeStats.totalRatings,
                averageRating: brandDailyChallengeStats.averageRating,
                rank: brandDailyChallengeStats.rank,
            })
            .from(brandDailyChallengeStats)
            .innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id))
            .where(eq(brandDailyChallengeStats.statDate, today));

        console.log('\nVerifying Target Brands:');
        for (const brandName of targetBrands) {
            const b = results.find(r => r.name === brandName);
            if (b) {
                const expectedPoints = (b.totalRatings * 6) + Math.floor(parseFloat(b.averageRating) * 5) + (b.rank === 1 ? 50 : b.rank === 2 ? 30 : b.rank === 3 ? 20 : 0);
                console.log(`\nBrand: ${brandName}`);
                console.log(`Points: ${b.totalPoints} (Expected: ${expectedPoints})`);
                console.log(`Ratings: ${b.totalRatings}, Avg: ${b.averageRating}, Rank: ${b.rank}`);

                if (Math.abs(b.totalPoints - expectedPoints) <= 1) {
                    console.log('✅ Score matches formula');
                } else {
                    console.log('❌ Score mismatch');
                }
            } else {
                console.log(`\nBrand: ${brandName} NOT FOUND in DB stats`);
            }
        }

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verifyBrandScoring();
