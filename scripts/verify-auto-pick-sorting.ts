import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from "../server/db";
import { manufacturers } from "../drizzle/schema";
import { manufacturerDailyChallengeStats } from "../drizzle/dailyChallengeSchema";
import { desc, eq, and, notInArray } from "drizzle-orm";
import { makeAutoPick } from "../server/autoPick";

// Mock the makeAutoPick function to test the query logic without side effects if possible,
// or just test the query logic directly as we did in verify-draft-sorting.ts but for the autoPick implementation.
// Since makeAutoPick has side effects (inserting into roster), we might want to just verify the query logic 
// that we PLAN to implement, or we can try to run makeAutoPick in a transaction and rollback (complex).
// 
// Better approach: Let's create a script that mimics the NEW logic we want to implement in autoPick.ts
// and verifies it returns the correct result compared to the OLD logic (which we can simulate or just observe).

async function verifyAutoPickSorting() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStatDate = yesterday.toISOString().split("T")[0];

    console.log(`Verifying Auto-Pick Sorting for date: ${yesterdayStatDate}`);

    // 1. Simulate OLD Logic (Static Sort)
    console.log("\n--- OLD LOGIC (Static Sort) ---");
    const oldResults = await db
        .select({
            id: manufacturers.id,
            name: manufacturers.name,
            productCount: manufacturers.productCount,
        })
        .from(manufacturers)
        .orderBy(desc(manufacturers.productCount))
        .limit(5);

    oldResults.forEach((r, i) => {
        console.log(`${i + 1}. ${r.name} (Product Count: ${r.productCount})`);
    });

    // 2. Simulate NEW Logic (Daily Points Sort)
    console.log("\n--- NEW LOGIC (Daily Points Sort) ---");
    const newResults = await db
        .select({
            id: manufacturers.id,
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
        .limit(5);

    newResults.forEach((r, i) => {
        console.log(`${i + 1}. ${r.name} (Points: ${r.points})`);
    });

    // 3. Compare top picks
    const oldTop = oldResults[0];
    const newTop = newResults[0];

    if (oldTop.id !== newTop.id) {
        console.log(`\n⚠️  DIFFERENCE DETECTED: Old logic picks ${oldTop.name}, New logic picks ${newTop.name}`);
        console.log("This confirms that the fix will change the behavior.");
    } else {
        console.log(`\nℹ️  NO DIFFERENCE: Both logics pick ${oldTop.name}.`);
        console.log("Try running this when points distribution differs from product count distribution.");
    }
}

verifyAutoPickSorting().catch(console.error);
