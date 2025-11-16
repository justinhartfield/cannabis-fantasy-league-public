const { Client } = require('pg');

const DATABASE_URL = 'postgresql://weedexchange_user:dNLH1zYnvPJ8HjMZxUvmZ0YBZ6CNv27d@dpg-d483rrchg0os7381fqjg-a.oregon-postgres.render.com/weedexchange';

async function checkScores() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get all challenge leagues
    const challengesResult = await client.query(`
      SELECT id, name, status, "createdAt", "leagueType"
      FROM leagues
      WHERE "leagueType" = 'challenge'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `);

    console.log(`Found ${challengesResult.rows.length} recent challenges\n`);

    for (const challenge of challengesResult.rows) {
      console.log(`\n=== Challenge: ${challenge.name} (ID: ${challenge.id}) ===`);
      console.log(`Status: ${challenge.status}`);
      console.log(`Created: ${challenge.createdAt}`);

      // Get teams
      const teamsResult = await client.query(`
        SELECT id, name, "userId"
        FROM teams
        WHERE "leagueId" = $1
      `, [challenge.id]);

      console.log(`Teams: ${teamsResult.rows.length}`);

      for (const team of teamsResult.rows) {
        console.log(`\n  Team: ${team.name} (ID: ${team.id})`);

        // Get daily scores
        const scoresResult = await client.query(`
          SELECT 
            "statDate",
            "mfg1Points",
            "mfg2Points",
            "cstr1Points",
            "cstr2Points",
            "prd1Points",
            "prd2Points",
            "phm1Points",
            "phm2Points",
            "brd1Points",
            "flexPoints",
            "bonusPoints",
            "penaltyPoints",
            "totalPoints"
          FROM "dailyTeamScores"
          WHERE "teamId" = $1 AND "challengeId" = $2
          ORDER BY "statDate" DESC
        `, [team.id, challenge.id]);

        console.log(`  Daily scores found: ${scoresResult.rows.length}`);

        for (const score of scoresResult.rows) {
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
          console.log(`    TOTAL (stored): ${score.totalPoints}`);
          
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
          
          console.log(`    TOTAL (calculated): ${calculatedTotal}`);
          console.log(`    Match: ${calculatedTotal === score.totalPoints ? '✓ CORRECT' : '✗ MISMATCH - BUG FOUND!'}`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkScores().catch(console.error);
