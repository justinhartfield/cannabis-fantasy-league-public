/**
 * One-time script to give all existing users 1000 starting points
 * Run with: npx tsx scripts/seed-user-points.ts
 */

import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { sql } from "drizzle-orm";

async function seedUserPoints() {
    console.log("🎮 Seeding 1000 starting points for all users...");

    const db = await getDb();
    if (!db) {
        console.error("❌ Database not available");
        process.exit(1);
    }

    try {
        // Update all users to have 1000 points
        const result = await db.update(users)
            .set({ referralCredits: 1000 })
            .returning({ id: users.id });

        console.log(`✅ Updated ${result.length} users to 1000 points`);
    } catch (error) {
        console.error("❌ Error updating users:", error);
        process.exit(1);
    }

    process.exit(0);
}

seedUserPoints();
