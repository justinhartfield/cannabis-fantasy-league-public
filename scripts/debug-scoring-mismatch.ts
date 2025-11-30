
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getDb } from '../server/db';
import { dailyTeamScores, dailyScoringBreakdowns, manufacturerDailyChallengeStats, teams, weeklyLineups } from '../drizzle/schema';
import { eq, and, gt, sql } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) throw new Error('No DB');

    console.log('Searching for teams with 0 total points in dailyTeamScores...');

    // Find a dailyTeamScore with 0 points
    const zeroScores = await db
        .select({
            id: dailyTeamScores.id,
            teamId: dailyTeamScores.teamId,
            challengeId: dailyTeamScores.challengeId,
            statDate: dailyTeamScores.statDate,
            totalPoints: dailyTeamScores.totalPoints,
        })
        .from(dailyTeamScores)
        .where(eq(dailyTeamScores.totalPoints, 0))
        .limit(5);

    if (zeroScores.length === 0) {
        console.log('No teams found with 0 points.');
        return;
    }

    for (const score of zeroScores) {
        console.log(`\nChecking Score ID: ${score.id}, Team: ${score.teamId}, Date: ${score.statDate}`);

        // Check if there are breakdowns
        const breakdowns = await db
            .select()
            .from(dailyScoringBreakdowns)
            .where(eq(dailyScoringBreakdowns.dailyTeamScoreId, score.id));

        console.log(`Found ${breakdowns.length} breakdown entries.`);

        // Check if any breakdown has points (which would be weird if total is 0, unless they sum to 0)
        const breakdownsWithPoints = breakdowns.filter(b => b.totalPoints > 0);
        console.log(`Breakdowns with >0 points: ${breakdownsWithPoints.length}`);

        // Check if there are stats for the lineup
        // Get lineup
        const lineup = await db
            .select()
            .from(weeklyLineups)
            .where(eq(weeklyLineups.teamId, score.teamId)) // Note: this might need year/week matching, simplifying for now
            .limit(1);

        if (lineup.length > 0) {
            const l = lineup[0];
            console.log('Lineup found. Checking MFG1 stats...');
            if (l.mfg1Id) {
                const stats = await db
                    .select()
                    .from(manufacturerDailyChallengeStats)
                    .where(and(
                        eq(manufacturerDailyChallengeStats.manufacturerId, l.mfg1Id),
                        eq(manufacturerDailyChallengeStats.statDate, score.statDate)
                    ));
                console.log(`MFG1 (ID ${l.mfg1Id}) Stats:`, stats.length > 0 ? 'Found' : 'Not Found');
                if (stats.length > 0) {
                    console.log('  Points in stats:', stats[0].totalPoints);
                }
            }
        }
    }
}

main().catch(console.error).then(() => process.exit(0));
