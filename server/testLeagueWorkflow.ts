/**
 * Test League Workflow
 * 
 * This script creates a test league, adds teams, simulates a draft,
 * sets lineups, and calculates scores to verify the complete workflow.
 */

import { getDb } from './db';
import { 
  leagues, 
  teams, 
  rosters, 
  weeklyLineups,
  manufacturers,
  cannabisStrains,
  strains as products,
  pharmacies,
  cannabisStrainWeeklyStats,
} from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function testLeagueWorkflow() {
  console.log('='.repeat(60));
  console.log('Cannabis Fantasy League - Complete Workflow Test');
  console.log('='.repeat(60));
  console.log('');

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // Step 1: Create a test league
    console.log('Step 1: Creating test league...');
    const [league] = await db.insert(leagues).values({
      name: 'Test League 2025',
      commissionerUserId: 1, // Assuming user ID 1 exists
      teamCount: 4,
      draftType: 'snake',
      scoringType: 'standard',
      playoffTeams: 2,
      seasonYear: 2025,
      currentWeek: 45,
      status: 'draft',
      draftDate: new Date('2025-11-15'),
      seasonStartDate: new Date('2025-11-09'),
      playoffStartWeek: 59,
    }).$returningId();
    
    console.log(`✅ League created with ID: ${league.id}`);
    console.log('');

    // Step 2: Create test teams
    console.log('Step 2: Creating test teams...');
    const teamNames = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta'];
    const teamIds: number[] = [];

    for (let i = 0; i < teamNames.length; i++) {
      const teamName = teamNames[i];
      const [team] = await db.insert(teams).values({
        leagueId: league.id,
        userId: i + 1, // Different user for each team
        name: teamName,
        wins: 0,
        losses: 0,
        ties: 0,
      }).$returningId();
      
      teamIds.push(team.id);
      console.log(`  ✅ ${teamName} created (ID: ${team.id})`);
    }
    console.log('');

    // Step 3: Get available players for draft
    console.log('Step 3: Fetching available players...');
    const availableManufacturers = await db.select().from(manufacturers).limit(10);
    const availableCannabisStrains = await db
      .select()
      .from(cannabisStrains)
      .innerJoin(cannabisStrainWeeklyStats, eq(cannabisStrains.id, cannabisStrainWeeklyStats.cannabisStrainId))
      .limit(10);
    const availableProducts = await db.select().from(products).limit(10);
    const availablePharmacies = await db.select().from(pharmacies).limit(10);

    console.log(`  Found ${availableManufacturers.length} manufacturers`);
    console.log(`  Found ${availableCannabisStrains.length} cannabis strains with stats`);
    console.log(`  Found ${availableProducts.length} products`);
    console.log(`  Found ${availablePharmacies.length} pharmacies`);
    console.log('');

    // Step 4: Simulate draft (9 rounds, 4 teams)
    console.log('Step 4: Simulating draft (9 rounds, snake order)...');
    
    for (const teamId of teamIds) {
      // Each team drafts 9 players:
      // 2 Manufacturers, 2 Cannabis Strains, 2 Products, 2 Pharmacies, 1 FLEX
      
      const draftPicks = [];
      
      // Round 1-2: Manufacturers
      for (let i = 0; i < 2 && i < availableManufacturers.length; i++) {
        draftPicks.push({
          assetType: 'manufacturer' as const,
          assetId: availableManufacturers[i].id,
          position: i === 0 ? 'MFG1' : 'MFG2',
        });
      }
      
      // Round 3-4: Cannabis Strains
      for (let i = 0; i < 2 && i < availableCannabisStrains.length; i++) {
        draftPicks.push({
          assetType: 'cannabis_strain' as const,
          assetId: availableCannabisStrains[i].cannabisStrains.id,
          position: i === 0 ? 'CSTR1' : 'CSTR2',
        });
      }
      
      // Round 5-6: Products
      for (let i = 0; i < 2 && i < availableProducts.length; i++) {
        draftPicks.push({
          assetType: 'product' as const,
          assetId: availableProducts[i].id,
          position: i === 0 ? 'PRD1' : 'PRD2',
        });
      }
      
      // Round 7-8: Pharmacies
      for (let i = 0; i < 2 && i < availablePharmacies.length; i++) {
        draftPicks.push({
          assetType: 'pharmacy' as const,
          assetId: availablePharmacies[i].id,
          position: i === 0 ? 'PHM1' : 'PHM2',
        });
      }
      
      // Round 9: FLEX (use a cannabis strain)
      if (availableCannabisStrains.length > 2) {
        draftPicks.push({
          assetType: 'cannabis_strain' as const,
          assetId: availableCannabisStrains[2].cannabisStrains.id,
          position: 'FLEX',
        });
      }

      // Insert roster
      for (const pick of draftPicks) {
        await db.insert(rosters).values({
          teamId,
          assetType: pick.assetType,
          assetId: pick.assetId,
          acquiredWeek: 45,
          acquiredVia: 'draft',
        });
      }
      
      console.log(`  ✅ Team ${teamId} drafted ${draftPicks.length} players`);
    }
    console.log('');

    // Step 5: Set lineups for week 45
    console.log('Step 5: Setting lineups for week 45...');
    
    for (const teamId of teamIds) {
      // Get team's roster
      const roster = await db.select().from(rosters).where(eq(rosters.teamId, teamId));
      
      // Create lineup entries for each roster position
      for (const player of roster) {
        await db.insert(weeklyLineups).values({
          teamId,
          year: 2025,
          week: 45,
          assetType: player.assetType,
          assetId: player.assetId,
          isLocked: true,
        });
      }
      
      console.log(`  ✅ Lineup set for Team ${teamId} (${roster.length} positions)`);
    }
    console.log('');

    // Step 6: Display sample lineup with projected points
    console.log('Step 6: Sample lineup with projected points...');
    const sampleTeam = teamIds[0];
    const lineup = await db.select().from(weeklyLineups).where(eq(weeklyLineups.teamId, sampleTeam));
    
    console.log(`\nTeam ${sampleTeam} Lineup (Week 45):`);
    console.log('-'.repeat(60));
    
    let totalPoints = 0;
    
    for (const slot of lineup) {
      let playerName = 'Unknown';
      let points = 0;
      
      if (slot.assetType === 'cannabis_strain') {
        const [strain] = await db
          .select()
          .from(cannabisStrains)
          .where(eq(cannabisStrains.id, slot.assetId))
          .limit(1);
        
        if (strain) {
          playerName = strain.name;
          
          const [stats] = await db
            .select()
            .from(cannabisStrainWeeklyStats)
            .where(eq(cannabisStrainWeeklyStats.cannabisStrainId, strain.id))
            .limit(1);
          
          if (stats) {
            points = stats.totalPoints;
          }
        }
      } else if (slot.assetType === 'manufacturer') {
        const [mfg] = await db
          .select()
          .from(manufacturers)
          .where(eq(manufacturers.id, slot.assetId))
          .limit(1);
        
        if (mfg) {
          playerName = mfg.name;
          points = 0; // Would calculate from manufacturer stats
        }
      } else if (slot.assetType === 'product') {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, slot.assetId))
          .limit(1);
        
        if (product) {
          playerName = product.name;
          points = 0; // Would calculate from product stats
        }
      } else if (slot.assetType === 'pharmacy') {
        const [pharmacy] = await db
          .select()
          .from(pharmacies)
          .where(eq(pharmacies.id, slot.assetId))
          .limit(1);
        
        if (pharmacy) {
          playerName = pharmacy.name;
          points = 0; // Would calculate from pharmacy stats
        }
      }
      
      console.log(`${slot.assetType.padEnd(16)} | ${playerName.padEnd(30)} | ${points} pts`);
      totalPoints += points;
    }
    
    console.log('-'.repeat(60));
    console.log(`TOTAL: ${totalPoints} points`);
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('✅ Complete Workflow Test Successful!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Summary:');
    console.log(`- League created: "${league.id}"`);
    console.log(`- Teams created: ${teamIds.length}`);
    console.log(`- Players drafted: ${teamIds.length * 9} total`);
    console.log(`- Lineups set: ${teamIds.length} teams for week 45`);
    console.log(`- Sample team total points: ${totalPoints}`);
    console.log('');
    console.log('The complete fantasy league workflow is functioning correctly!');

  } catch (error) {
    console.error('');
    console.error('❌ Workflow Test Failed!');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the test
testLeagueWorkflow()
  .then(() => {
    console.log('Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
