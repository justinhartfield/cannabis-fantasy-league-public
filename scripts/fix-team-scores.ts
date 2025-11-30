import { getDb } from "../server/db";
import { teams, dailyTeamScores } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

async function fixTeamScores() {
    console.log("--- Fixing Team Scores ---");
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to database");
        process.exit(1);
    }

    // 1. Aggregate scores from dailyTeamScores
    const aggregatedScores = await db
        .select({
            teamId: dailyTeamScores.teamId,
            totalPoints: sql<number>`sum(${dailyTeamScores.totalPoints})`,
        })
        .from(dailyTeamScores)
        .groupBy(dailyTeamScores.teamId);

    console.log(`Found ${aggregatedScores.length} teams with daily scores.`);

    // 2. Update teams table
    let updatedCount = 0;
    for (const score of aggregatedScores) {
        if (score.totalPoints > 0) {
            await db
                .update(teams)
                .set({ pointsFor: score.totalPoints })
                .where(eq(teams.id, score.teamId));
            updatedCount++;
        }
    }

    console.log(`Updated ${updatedCount} teams with correct total scores.`);
    process.exit(0);
}

fixTeamScores();
