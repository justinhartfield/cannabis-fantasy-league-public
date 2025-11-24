
import { getDb } from '../server/db';
import { brandDailyChallengeStats, manufacturerDailyChallengeStats } from '../drizzle/dailyChallengeSchema';
import { brands } from '../drizzle/schema';
import { desc, eq, sql, and } from 'drizzle-orm';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
    dotenv.config({ path: '.env' });
}

async function verifyLeaderboardLogic() {
    const db = await getDb();
    if (!db) {
        console.error('Database not available');
        return;
    }

    console.log('--- Verifying Daily Leaderboard Date Selection ---');

    // Simulate the date selection logic
    const [latestMfg, latestBrand] = await Promise.all([
        db
            .select({ date: manufacturerDailyChallengeStats.statDate })
            .from(manufacturerDailyChallengeStats)
            .orderBy(desc(manufacturerDailyChallengeStats.statDate))
            .limit(1),
        db
            .select({ date: brandDailyChallengeStats.statDate })
            .from(brandDailyChallengeStats)
            .orderBy(desc(brandDailyChallengeStats.statDate))
            .limit(1)
    ]);

    const mfgDate = latestMfg.length > 0 ? latestMfg[0].date : null;
    const brandDate = latestBrand.length > 0 ? latestBrand[0].date : null;

    console.log(`Latest Manufacturer Date: ${mfgDate}`);
    console.log(`Latest Brand Date: ${brandDate}`);

    let targetDate = null;
    if (mfgDate && brandDate) {
        targetDate = mfgDate > brandDate ? mfgDate : brandDate;
    } else if (mfgDate) {
        targetDate = mfgDate;
    } else if (brandDate) {
        targetDate = brandDate;
    }

    console.log(`Selected Target Date: ${targetDate}`);

    if (targetDate) {
        const topBrands = await db
            .select({
                name: brands.name,
                score: brandDailyChallengeStats.totalPoints
            })
            .from(brandDailyChallengeStats)
            .innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id))
            .where(eq(brandDailyChallengeStats.statDate, targetDate))
            .orderBy(desc(brandDailyChallengeStats.totalPoints))
            .limit(5);

        console.log('\nTop Brands for Target Date:');
        topBrands.forEach((b, i) => console.log(`#${i + 1} ${b.name}: ${b.score} pts`));
    }

    console.log('\n--- Verifying Weekly Leaderboard Aggregation ---');
    // Simulate Weekly Aggregation for current week
    const now = new Date();
    const currentYear = now.getFullYear();
    // Calculate week number (simple approx)
    const onejan = new Date(currentYear, 0, 1);
    const week = Math.ceil((((now.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);

    console.log(`Simulating for Year ${currentYear}, Week ${week}`);

    // Calculate date range
    const simpleDate = new Date(currentYear, 0, 1 + (week - 1) * 7);
    const dayOfWeek = simpleDate.getDay();
    const ISOweekStart = simpleDate;
    if (dayOfWeek <= 4)
        ISOweekStart.setDate(simpleDate.getDate() - simpleDate.getDay() + 1);
    else
        ISOweekStart.setDate(simpleDate.getDate() + 8 - simpleDate.getDay());

    const startDate = ISOweekStart.toISOString().split('T')[0];
    const endDate = new Date(ISOweekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`Date Range: ${startDate} to ${endDate}`);

    const weeklyBrands = await db
        .select({
            name: brands.name,
            score: sql<number>`sum(${brandDailyChallengeStats.totalPoints})`.mapWith(Number),
        })
        .from(brandDailyChallengeStats)
        .innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id))
        .where(
            and(
                sql`${brandDailyChallengeStats.statDate} >= ${startDate}`,
                sql`${brandDailyChallengeStats.statDate} <= ${endDate}`
            )
        )
        .groupBy(brands.id, brands.name)
        .orderBy(desc(sql`sum(${brandDailyChallengeStats.totalPoints})`))
        .limit(5);

    console.log('\nTop Brands for Week:');
    weeklyBrands.forEach((b, i) => console.log(`#${i + 1} ${b.name}: ${b.score} pts`));

    process.exit(0);
}

verifyLeaderboardLogic().catch(console.error);
