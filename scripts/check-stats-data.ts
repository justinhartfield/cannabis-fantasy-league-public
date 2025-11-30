
import { getDb } from "../server/db";
import { manufacturerDailyChallengeStats } from "../drizzle/dailyChallengeSchema";
import { desc, eq } from "drizzle-orm";

async function checkStats() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const stats = await db
        .select()
        .from(manufacturerDailyChallengeStats)
        .orderBy(desc(manufacturerDailyChallengeStats.statDate))
        .limit(5);

    console.log("Recent Stats Entries:");
    console.log(stats);
}

checkStats().catch(console.error);
