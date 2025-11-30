import { getDb } from "../server/db";
import { teams, users, leagues, dailyTeamScores } from "../drizzle/schema";
import { desc, gt, eq } from "drizzle-orm";

async function debugLeaderboard() {
    console.log("--- Debugging Leaderboard ---");
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to database");
        process.exit(1);
    }

    // 1. Check total number of teams
    const allTeams = await db.select().from(teams);
    console.log(`Total teams found: ${allTeams.length}`);

    // 2. Check teams with points > 0
    const teamsWithPoints = await db
        .select()
        .from(teams)
        .where(gt(teams.pointsFor, 0))
        .orderBy(desc(teams.pointsFor));

    console.log(`Teams with points > 0: ${teamsWithPoints.length}`);
    if (teamsWithPoints.length > 0) {
        console.log("Top 5 teams with points:", teamsWithPoints.slice(0, 5).map(t => ({ id: t.id, name: t.name, points: t.pointsFor, userId: t.userId, leagueId: t.leagueId })));
    }

    // 2b. Check dailyTeamScores
    console.log("\n--- Checking Daily Team Scores ---");
    const dailyScores = await db
        .select()
        .from(dailyTeamScores)
        .where(gt(dailyTeamScores.totalPoints, 0))
        .limit(5);

    const totalDailyScores = await db.select().from(dailyTeamScores);
    console.log(`Total daily score records: ${totalDailyScores.length}`);
    console.log(`Daily score records with points > 0: ${dailyScores.length}`);
    if (dailyScores.length > 0) {
        console.log("Sample daily scores:", dailyScores);
    } else {
        console.log("No daily scores with points > 0 found!");
    }

    // 3. Check joins (what the router does)
    console.log("\n--- Checking Joins ---");
    try {
        const seasonLeaders = await db
            .select({
                teamId: teams.id,
                teamName: teams.name,
                totalScore: teams.pointsFor,
                userId: users.id,
                userName: users.name,
                leagueName: leagues.name,
            })
            .from(teams)
            .innerJoin(users, eq(teams.userId, users.id))
            .innerJoin(leagues, eq(teams.leagueId, leagues.id))
            .where(gt(teams.pointsFor, 0))
            .orderBy(desc(teams.pointsFor))
            .limit(5);

        console.log(`Joined query result count: ${seasonLeaders.length}`);
        if (seasonLeaders.length > 0) {
            console.log("Top 5 joined results:", seasonLeaders);
        } else {
            console.log("Joined query returned NO results. Checking for orphaned teams...");
            // Check if users exist for the top teams
            if (teamsWithPoints.length > 0) {
                const topTeam = teamsWithPoints[0];
                const user = await db.select().from(users).where(eq(users.id, topTeam.userId));
                console.log(`User for top team (${topTeam.name}, userId: ${topTeam.userId}):`, user);

                const league = await db.select().from(leagues).where(eq(leagues.id, topTeam.leagueId));
                console.log(`League for top team (${topTeam.name}, leagueId: ${topTeam.leagueId}):`, league);
            }
        }
    } catch (error) {
        console.error("Error running joined query:", error);
    }

    process.exit(0);
}

debugLeaderboard();
