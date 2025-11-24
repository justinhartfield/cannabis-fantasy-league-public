
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from '../server/db';
import { brandDailyChallengeStats } from '../drizzle/dailyChallengeSchema';
import { brands } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

async function fixBrandScores() {
    const db = await getDb();
    if (!db) throw new Error('DB not available');

    console.log('Checking for brands with legacy scoring...');

    // Fetch all brand stats
    // We can filter by date if needed, but let's check everything for now to be safe
    // or at least the current week.
    // Let's look for the specific case first.

    const stats = await db
        .select({
            statDate: brandDailyChallengeStats.statDate,
            brandId: brandDailyChallengeStats.brandId,
            name: brands.name,
            totalPoints: brandDailyChallengeStats.totalPoints,
            totalRatings: brandDailyChallengeStats.totalRatings,
            averageRating: brandDailyChallengeStats.averageRating,
            rank: brandDailyChallengeStats.rank,
        })
        .from(brandDailyChallengeStats)
        .innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id))
        .orderBy(desc(brandDailyChallengeStats.statDate));

    console.log(`Found ${stats.length} brand stat records.`);

    let updates = 0;

    for (const stat of stats) {
        const bayesianAvg = parseFloat(stat.averageRating); // Using average as proxy if bayesian not available in this select, but formula uses bayesian. 
        // Note: The DB has bayesianAverage column, let's use it if possible.
        // But for now, let's assume averageRating is close enough or fetch bayesian.
        // Actually, let's fetch bayesianAverage too.
    }
}

// Re-write with correct columns
async function fixBrandScoresCorrect() {
    const db = await getDb();
    if (!db) throw new Error('DB not available');

    const stats = await db
        .select({
            statDate: brandDailyChallengeStats.statDate,
            brandId: brandDailyChallengeStats.brandId,
            name: brands.name,
            totalPoints: brandDailyChallengeStats.totalPoints,
            totalRatings: brandDailyChallengeStats.totalRatings,
            averageRating: brandDailyChallengeStats.averageRating,
            bayesianAverage: brandDailyChallengeStats.bayesianAverage,
            rank: brandDailyChallengeStats.rank,
        })
        .from(brandDailyChallengeStats)
        .innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id))
        .orderBy(desc(brandDailyChallengeStats.statDate));

    let updates = 0;

    for (const stat of stats) {
        // New Formula:
        // Rating Count: ratings * 6
        // Rating Quality: bayesianAvg * 5 (if ratings > 0)
        // Rank Bonus: #1=50, #2=30, #3=20, #4-5=15, #6-10=10

        const ratings = stat.totalRatings || 0;
        const bayesianAvg = parseFloat(stat.bayesianAverage || stat.averageRating || '0');
        const rank = stat.rank || 0;

        let calculatedPoints = (ratings * 6);
        if (ratings > 0) {
            calculatedPoints += Math.floor(bayesianAvg * 5);
        }

        let rankBonus = 0;
        if (rank === 1) rankBonus = 50;
        else if (rank === 2) rankBonus = 30;
        else if (rank === 3) rankBonus = 20;
        else if (rank >= 4 && rank <= 5) rankBonus = 15;
        else if (rank >= 6 && rank <= 10) rankBonus = 10;

        calculatedPoints += rankBonus;

        if (stat.totalPoints !== calculatedPoints) {
            console.log(`Fixing ${stat.name} (${stat.statDate}): ${stat.totalPoints} -> ${calculatedPoints}`);
            console.log(`  Ratings: ${ratings}, Avg: ${bayesianAvg}, Rank: ${rank}`);

            await db
                .update(brandDailyChallengeStats)
                .set({ totalPoints: calculatedPoints })
                .where(and(
                    eq(brandDailyChallengeStats.brandId, stat.brandId),
                    eq(brandDailyChallengeStats.statDate, stat.statDate)
                ));

            updates++;
        }
    }

    console.log(`Updated ${updates} records.`);
}

fixBrandScoresCorrect().catch(console.error);
