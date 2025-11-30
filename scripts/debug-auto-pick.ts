import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getDb } from "../server/db";
import { leagues, teams, rosters } from "../drizzle/schema";
import { eq, like } from "drizzle-orm";
import { autoPickService } from "../server/autoPick";
import { calculateNextPick } from "../server/draftLogic";

/**
 * Debug script for testing the new AutoPickService
 * 
 * Usage: npx tsx scripts/debug-auto-pick.ts [teamName]
 * 
 * If no teamName is provided, it will show current draft status
 */

async function debugAutoPick() {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const teamNameArg = process.argv[2];

    if (teamNameArg) {
        // Find specific team
        console.log(`Searching for team matching '${teamNameArg}'...`);

        const [team] = await db
            .select()
            .from(teams)
            .where(like(teams.name, `%${teamNameArg}%`))
            .limit(1);

        if (!team) {
            console.error("Team not found!");
            return;
        }

        console.log(`Found team: ${team.name} (ID: ${team.id}) in League ${team.leagueId}`);
        console.log(`Auto-pick enabled: ${team.autoPickEnabled === 1}`);

        // Get league info
        const [league] = await db
            .select()
            .from(leagues)
            .where(eq(leagues.id, team.leagueId))
            .limit(1);

        if (!league) {
            console.error("League not found!");
            return;
        }

        console.log(`\nLeague: ${league.name}`);
        console.log(`Type: ${league.leagueType}`);
        console.log(`Draft started: ${league.draftStarted === 1}`);
        console.log(`Draft completed: ${league.draftCompleted === 1}`);
        console.log(`Current pick: ${league.currentDraftPick}`);
        console.log(`Current round: ${league.currentDraftRound}`);

        // Get current turn
        try {
            const nextPick = await calculateNextPick(team.leagueId);
            console.log(`\nCurrent turn: Team ${nextPick.teamId} (${nextPick.teamName}) - Pick ${nextPick.pickNumber}, Round ${nextPick.round}`);

            if (nextPick.teamId === team.id) {
                console.log("✅ It IS this team's turn!");
            } else {
                console.log("⚠️ It is NOT this team's turn");
            }
        } catch (error) {
            console.error("Failed to calculate next pick:", error);
        }

        // Get team roster
        const roster = await db
            .select()
            .from(rosters)
            .where(eq(rosters.teamId, team.id));

        console.log(`\nTeam roster (${roster.length} items):`);
        const counts: Record<string, number> = {};
        for (const item of roster) {
            counts[item.assetType] = (counts[item.assetType] || 0) + 1;
        }
        console.log(counts);

        // Ask if user wants to test auto-pick
        console.log("\n---");
        console.log("To test auto-pick, run:");
        console.log(`  npx tsx scripts/debug-auto-pick.ts ${teamNameArg} --execute`);

        if (process.argv[3] === '--execute') {
            console.log("\n🚀 Executing auto-pick...");
            try {
                const result = await autoPickService.executeAutoPick(team.leagueId, team.id);
                console.log("\n📊 Result:", JSON.stringify(result, null, 2));
            } catch (error) {
                console.error("\n❌ Error:", error);
            }
        }
    } else {
        // Show all active drafts
        console.log("Active drafts:\n");

        const activeLeagues = await db
            .select()
            .from(leagues)
            .where(eq(leagues.draftStarted, 1));

        for (const league of activeLeagues) {
            if (league.draftCompleted === 1) continue;

            console.log(`League ${league.id}: ${league.name} (${league.leagueType})`);
            console.log(`  Pick ${league.currentDraftPick}, Round ${league.currentDraftRound}`);

            try {
                const nextPick = await calculateNextPick(league.id);
                console.log(`  Current turn: ${nextPick.teamName} (Team ${nextPick.teamId})`);
            } catch (error) {
                console.log(`  Error getting current turn: ${error}`);
            }

            // Get circuit breaker status
            const cbStatus = autoPickService.getCircuitBreakerStatus(league.id);
            if (cbStatus.failures > 0) {
                console.log(`  ⚠️ Circuit breaker: ${cbStatus.failures} failures (tripped: ${cbStatus.tripped})`);
            }

            console.log("");
        }

        if (activeLeagues.filter(l => l.draftCompleted !== 1).length === 0) {
            console.log("No active drafts found.");
        }

        console.log("\nUsage: npx tsx scripts/debug-auto-pick.ts [teamName]");
    }
}

debugAutoPick()
    .then(() => {
        console.log("\nDone.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
