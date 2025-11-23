import * as dotenv from 'dotenv';
import path from 'path';
import { getDb } from './db';
import { leagues, teams } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function recalculateAllWeeks() {
    const db = await getDb();
    if (!db) {
        console.error('Database not available');
        return;
    }

    // Get all season-long leagues
    const allLeagues = await db
        .select()
        .from(leagues)
        .where(eq(leagues.leagueType, 'season'));

    console.log(`Found ${allLeagues.length} season-long leagues`);

    for (const league of allLeagues) {
        console.log(`\n[League: ${league.name}] Recalculating scores...`);

        // Get all teams in this league
        const leagueTeams = await db
            .select()
            .from(teams)
            .where(eq(teams.leagueId, league.id));

        // Import the scoring function
        const { calculateSeasonTeamWeek } = await import('./scoringEngine');

        // Recalculate for 2024 weeks 1-52 and 2025 weeks 1-10 (adjust as needed)
        const years = [2024, 2025];
        const weekRanges: Record<number, number[]> = {
            2024: Array.from({ length: 52 }, (_, i) => i + 1),
            2025: Array.from({ length: 10 }, (_, i) => i + 1), // Adjust based on current week
        };

        for (const year of years) {
            for (const week of weekRanges[year]) {
                try {
                    console.log(`  [${year} W${week}] Calculating for ${leagueTeams.length} teams...`);

                    // Calculate for each team
                    for (const team of leagueTeams) {
                        await calculateSeasonTeamWeek(league.id, team.id, year, week);
                    }

                    console.log(`  [${year} W${week}] ✓ Complete`);
                } catch (error) {
                    console.error(`  [${year} W${week}] ✗ Error:`, error instanceof Error ? error.message : error);
                }
            }
        }
    }
    console.log('\n✓ Recalculation complete!');
    process.exit(0);
}

recalculateAllWeeks().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
