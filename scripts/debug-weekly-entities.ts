import { getDb } from "../server/db";
import {
    manufacturerDailyChallengeStats,
    pharmacyDailyChallengeStats,
    brandDailyChallengeStats,
    productDailyChallengeStats,
    strainDailyChallengeStats,
} from "../drizzle/dailyChallengeSchema";
import { sql, desc } from "drizzle-orm";

async function debugWeeklyEntities() {
    console.log("--- Debugging Weekly Entity Stats ---");
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to database");
        process.exit(1);
    }

    // Calculate current week range (ISO week)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Sun) - 6 (Sat)
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(now.setDate(monday.getDate() + 6));

    const startDate = monday.toISOString().split('T')[0];
    const endDate = sunday.toISOString().split('T')[0];

    console.log(`Checking stats for week: ${startDate} to ${endDate}`);

    // Check Manufacturers
    const mfgStats = await db
        .select({
            count: sql<number>`count(*)`,
            totalScore: sql<number>`sum(${manufacturerDailyChallengeStats.totalPoints})`
        })
        .from(manufacturerDailyChallengeStats)
        .where(sql`${manufacturerDailyChallengeStats.statDate} >= ${startDate} AND ${manufacturerDailyChallengeStats.statDate} <= ${endDate}`);

    console.log("Manufacturers:", mfgStats[0]);

    // Check Pharmacies
    const phmStats = await db
        .select({
            count: sql<number>`count(*)`,
            totalScore: sql<number>`sum(${pharmacyDailyChallengeStats.totalPoints})`
        })
        .from(pharmacyDailyChallengeStats)
        .where(sql`${pharmacyDailyChallengeStats.statDate} >= ${startDate} AND ${pharmacyDailyChallengeStats.statDate} <= ${endDate}`);

    console.log("Pharmacies:", phmStats[0]);

    // Check Brands
    const brandStats = await db
        .select({
            count: sql<number>`count(*)`,
            totalScore: sql<number>`sum(${brandDailyChallengeStats.totalPoints})`
        })
        .from(brandDailyChallengeStats)
        .where(sql`${brandDailyChallengeStats.statDate} >= ${startDate} AND ${brandDailyChallengeStats.statDate} <= ${endDate}`);

    console.log("Brands:", brandStats[0]);

    process.exit(0);
}

debugWeeklyEntities();
