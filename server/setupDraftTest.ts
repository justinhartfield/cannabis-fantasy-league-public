/**
 * Setup Draft Test
 * Creates a league with multiple teams ready for draft testing
 */

import { getDb } from './db';
import { users, leagues, teams } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function setupDraftTest() {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  console.log('Setting up draft test league...\n');

  // Create 4 test users
  const testUsers = [];
  for (let i = 1; i <= 4; i++) {
    const username = `draftuser${i}`;
    
    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.openId, username))
      .limit(1);

    if (existingUser) {
      testUsers.push(existingUser);
      console.log(`✓ User ${username} already exists (ID: ${existingUser.id})`);
    } else {
      const [newUser] = await db
        .insert(users)
        .values({
          openId: username,
          name: `Draft User ${i}`,
          email: `${username}@test.local`,
          loginMethod: 'mock',
        })
        .$returningId();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, newUser.id))
        .limit(1);

      testUsers.push(user);
      console.log(`✓ Created user ${username} (ID: ${user.id})`);
    }
  }

  // Create a draft-ready league
  const [newLeague] = await db
    .insert(leagues)
    .values({
      name: 'Draft Test League',
      commissionerUserId: testUsers[0].id,
      teamCount: 4,
      playoffTeams: 2,
      draftType: 'snake',
      scoringType: 'standard',
      status: 'draft',
      seasonYear: 2025,
      currentWeek: 1,
    })
    .$returningId();

  console.log(`\n✓ Created league "Draft Test League" (ID: ${newLeague.id})`);

  // Create teams for each user
  const teamNames = ['Green Dragons', 'Purple Haze', 'Blue Dream Squad', 'OG Kush Kings'];
  const createdTeams = [];

  for (let i = 0; i < testUsers.length; i++) {
    const [newTeam] = await db
      .insert(teams)
      .values({
        leagueId: newLeague.id,
        userId: testUsers[i].id,
        name: teamNames[i],
        draftPosition: i + 1,
        faabBudget: 100,
        waiverPriority: i + 1,
      })
      .$returningId();

    createdTeams.push(newTeam);
    console.log(`✓ Created team "${teamNames[i]}" for ${testUsers[i].name} (Position: ${i + 1})`);
  }

  console.log('\n🎉 Draft test league setup complete!');
  console.log('\n📋 Summary:');
  console.log(`   League ID: ${newLeague.id}`);
  console.log(`   League Name: Draft Test League`);
  console.log(`   Teams: ${testUsers.length}`);
  console.log(`   Draft Order: Snake`);
  console.log(`   Status: Ready for draft`);
  console.log('\n🔗 Access the league:');
  console.log(`   https://3000-iyvbiu2ym4ic9pjtu17go-b6ac284f.manusvm.computer/league/${newLeague.id}`);
  console.log('\n👥 Test users:');
  testUsers.forEach((user, i) => {
    console.log(`   ${i + 1}. ${user.name} (${user.openId}) - Team: ${teamNames[i]}`);
  });

  return {
    leagueId: newLeague.id,
    users: testUsers,
    teams: createdTeams,
  };
}

setupDraftTest()
  .then(() => {
    console.log('\n✅ Setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
