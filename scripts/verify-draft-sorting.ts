
import { getDb } from "../server/db";
import { manufacturers } from "../drizzle/schema";
import { manufacturerDailyChallengeStats } from "../drizzle/dailyChallengeSchema";
import { desc, eq, and } from "drizzle-orm";

async function verifySorting() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStatDate = yesterday.toISOString().split("T")[0];

    console.log(`Verifying sorting for date: ${yesterdayStatDate}`);

    // Simulate the query in draftRouter.ts
    const results = await db
        .select({
            name: manufacturers.name,
            points: manufacturerDailyChallengeStats.totalPoints,
        })
        .from(manufacturers)
        .leftJoin(
            manufacturerDailyChallengeStats,
            and(
                eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id),
                eq(manufacturerDailyChallengeStats.statDate, yesterdayStatDate)
            )
        )
        .orderBy(desc(manufacturerDailyChallengeStats.totalPoints))
        .limit(10);

    console.log("Top 10 Manufacturers by Yesterday's Points:");
    results.forEach((r, i) => {
        console.log(`${i + 1}. ${r.name}: ${r.points} pts`);
    });

    // Check if sorted
    let isSorted = true;
    for (let i = 0; i < results.length - 1; i++) {
        if ((results[i].points || 0) < (results[i + 1].points || 0)) {
            isSorted = false;
            break;
        }
    }

    if (isSorted) {
        console.log("✅ SUCCESS: Results are sorted by points descending.");
    } else {
        console.error("❌ FAILURE: Results are NOT sorted correctly.");
    }
}

verifySorting().catch(console.error);
