import { getDb } from './server/db';
import { dailyTeamScores, teams, leagues } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function debugScores() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get all challenge leagues
  const challenges = await db
    .select()
    .from(leagues)
    .where(eq(leagues.leagueType, 'challenge'));

  console.log(`\nFound ${challenges.length} challenges\n`);

  for (const challenge of challenges) {
    console.log(`\n=== Challenge: ${challenge.name} (ID: ${challenge.id}) ===`);
    console.log(`Status: ${challenge.status}`);
    console.log(`Created: ${challenge.createdAt}`);

    const challengeTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, challenge.id));

    console.log(`Teams: ${challengeTeams.length}`);

    for (const team of challengeTeams) {
      console.log(`\n  Team: ${team.name} (ID: ${team.id})`);

      const scores = await db
        .select()
        .from(dailyTeamScores)
        .where(and(
          eq(dailyTeamScores.teamId, team.id),
          eq(dailyTeamScores.challengeId, challenge.id)
        ));

      console.log(`  Daily scores found: ${scores.length}`);

      for (const score of scores) {
        console.log(`\n    Date: ${score.statDate}`);
        console.log(`    MFG1: ${score.mfg1Points}`);
        console.log(`    MFG2: ${score.mfg2Points}`);
        console.log(`    CSTR1: ${score.cstr1Points}`);
        console.log(`    CSTR2: ${score.cstr2Points}`);
        console.log(`    PRD1: ${score.prd1Points}`);
        console.log(`    PRD2: ${score.prd2Points}`);
        console.log(`    PHM1: ${score.phm1Points}`);
        console.log(`    PHM2: ${score.phm2Points}`);
        console.log(`    BRD1: ${score.brd1Points}`);
        console.log(`    FLEX: ${score.flexPoints}`);
        console.log(`    Bonus: ${score.bonusPoints}`);
        console.log(`    Penalty: ${score.penaltyPoints}`);
        console.log(`    TOTAL: ${score.totalPoints}`);
        
        // Calculate what the total should be
        const calculatedTotal = 
          score.mfg1Points +
          score.mfg2Points +
          score.cstr1Points +
          score.cstr2Points +
          score.prd1Points +
          score.prd2Points +
          score.phm1Points +
          score.phm2Points +
          score.brd1Points +
          score.flexPoints +
          score.bonusPoints +
          score.penaltyPoints;
        
        console.log(`    Calculated Total: ${calculatedTotal}`);
        console.log(`    Match: ${calculatedTotal === score.totalPoints ? '✓' : '✗ MISMATCH!'}`);
      }
    }
  }
}

debugScores().catch(console.error);
