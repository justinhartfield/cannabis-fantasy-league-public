
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getDb } from '../server/db';
import { dailyTeamScores } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { calculateDailyChallengeScores } from '../server/scoringEngine';

async function main() {
    const db = await getDb();
    if (!db) throw new Error('No DB');

    console.log('Searching for teams with 0 total points in dailyTeamScores...');

    // Find all dailyTeamScores with 0 points
    const zeroScores = await db
        .select({
            challengeId: dailyTeamScores.challengeId,
            statDate: dailyTeamScores.statDate,
        })
        .from(dailyTeamScores)
        .where(eq(dailyTeamScores.totalPoints, 0));

    if (zeroScores.length === 0) {
        console.log('No teams found with 0 points.');
        return;
    }

    console.log(`Found ${zeroScores.length} entries with 0 points.`);

    // Get unique challengeId + statDate combinations
    const uniqueCombinations = new Map<string, { challengeId: number; statDate: string }>();

    for (const score of zeroScores) {
        const key = `${score.challengeId}-${score.statDate}`;
        if (!uniqueCombinations.has(key)) {
            uniqueCombinations.set(key, score);
        }
    }

    console.log(`Found ${uniqueCombinations.size} unique challenge/date combinations to recalculate.`);

    for (const { challengeId, statDate } of uniqueCombinations.values()) {
        console.log(`Recalculating scores for Challenge ${challengeId} on ${statDate}...`);
        try {
            await calculateDailyChallengeScores(challengeId, statDate);
            console.log(`✅ Recalculation complete for Challenge ${challengeId} on ${statDate}`);
        } catch (error) {
            console.error(`❌ Failed to recalculate for Challenge ${challengeId} on ${statDate}:`, error);
        }
    }
}

main().catch(console.error).then(() => process.exit(0));
