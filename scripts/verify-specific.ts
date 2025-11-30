
import 'dotenv/config';
import { getDb } from "../server/db";
import { manufacturers } from "../drizzle/schema";
import { manufacturerDailyChallengeStats } from "../drizzle/dailyChallengeSchema";
import { desc, eq, and } from "drizzle-orm";

async function verifySpecific() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStatDate = yesterday.toISOString().split("T")[0];

    console.log(`Checking for manufacturer 921 on date: ${yesterdayStatDate}`);

    // Check if manufacturer exists
    const mfg = await db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.id, 921));
    console.log("Manufacturer 921:", mfg);

    // Check stats directly
    const stats = await db
        .select()
        .from(manufacturerDailyChallengeStats)
        .where(
            and(
                eq(manufacturerDailyChallengeStats.manufacturerId, 921),
                eq(manufacturerDailyChallengeStats.statDate, yesterdayStatDate)
            )
        );
    console.log("Stats for 921:", stats);

    // Check join
    const joinResult = await db
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
        .where(eq(manufacturers.id, 921));

    console.log("Join Result for 921:", joinResult);
}

verifySpecific().catch(console.error);
