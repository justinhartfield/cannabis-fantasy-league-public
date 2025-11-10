import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";

// Import schema
import { 
  users, 
  leagues, 
  teams, 
  rosters,
  manufacturers,
  cannabisStrains,
  strains,
  pharmacies,
  weeklyLineups
} from "./drizzle/schema.ts";

/**
 * Seed Test Data Script
 * 
 * Creates:
 * - 1 test league
 * - 2 test teams
 * - Roster data for team 1 (partially filled)
 * - Empty lineup for team 1
 */

async function main() {
  console.log("🌱 Starting seed script...");

  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  try {
    // 1. Get or create test user (owner)
    console.log("\n1️⃣ Checking for owner user...");
    let [ownerUser] = await db
      .select()
      .from(users)
      .where(eq(users.openId, process.env.OWNER_OPEN_ID))
      .limit(1);

    if (!ownerUser) {
      console.log("   Creating owner user...");
      const [newUser] = await db
        .insert(users)
        .values({
          openId: process.env.OWNER_OPEN_ID,
          name: process.env.OWNER_NAME || "Test Owner",
          email: "owner@test.com",
          role: "admin",
        })
        .$returningId();
      
      [ownerUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, newUser.id))
        .limit(1);
    }
    console.log(`   ✅ Owner user: ${ownerUser.name} (ID: ${ownerUser.id})`);

    // 2. Create test league
    console.log("\n2️⃣ Creating test league...");
    const [newLeague] = await db
      .insert(leagues)
      .values({
        name: "Test League - Cannabis Fantasy",
        commissionerUserId: ownerUser.id,
        seasonYear: 2025,
        scoringType: "standard",
        teamCount: 8,
        draftDate: new Date("2025-01-15"),
        status: "draft",
      })
      .$returningId();

    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, newLeague.id))
      .limit(1);
    
    console.log(`   ✅ League created: ${league.name} (ID: ${league.id})`);

    // 3. Create test teams
    console.log("\n3️⃣ Creating test teams...");
    
    // Team 1 - Owner's team
    const [newTeam1] = await db
      .insert(teams)
      .values({
        leagueId: league.id,
        userId: ownerUser.id,
        name: "Green Thunder",
        draftPosition: 1,
      })
      .$returningId();

    const [team1] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, newTeam1.id))
      .limit(1);
    
    console.log(`   ✅ Team 1: ${team1.name} (ID: ${team1.id}, Owner: ${ownerUser.name})`);

    // Create second test user for team 2
    const [newUser2] = await db
      .insert(users)
      .values({
        openId: "test_user_2_" + Date.now(),
        name: "Test User 2",
        email: "user2@test.com",
        role: "user",
      })
      .$returningId();

    const [user2] = await db
      .select()
      .from(users)
      .where(eq(users.id, newUser2.id))
      .limit(1);

    // Team 2 - Dummy team
    const [newTeam2] = await db
      .insert(teams)
      .values({
        leagueId: league.id,
        userId: user2.id, // Different user
        name: "Purple Haze",
        draftPosition: 2,
      })
      .$returningId();

    const [team2] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, newTeam2.id))
      .limit(1);
    
    console.log(`   ✅ Team 2: ${team2.name} (ID: ${team2.id})`);

    // 4. Fetch some real assets from database
    console.log("\n4️⃣ Fetching real assets from database...");
    
    const [mfg1, mfg2] = await db.select().from(manufacturers).limit(2);
    const [strain1, strain2] = await db.select().from(cannabisStrains).limit(2);
    const [product1] = await db.select().from(strains).limit(1);
    const [phm1, phm2] = await db.select().from(pharmacies).limit(2);

    console.log(`   ✅ Found assets:`);
    console.log(`      Manufacturers: ${mfg1?.name}, ${mfg2?.name}`);
    console.log(`      Cannabis Strains: ${strain1?.name}, ${strain2?.name}`);
    console.log(`      Products: ${product1?.name}`);
    console.log(`      Pharmacies: ${phm1?.name}, ${phm2?.name}`);

    // 5. Create roster for Team 1 (partially filled)
    console.log("\n5️⃣ Creating roster for Team 1...");
    
    const rosterEntries = [
      {
        teamId: team1.id,
        assetType: "manufacturer",
        assetId: mfg1.id,
        acquiredWeek: 0,
        acquiredVia: "draft",
      },
      {
        teamId: team1.id,
        assetType: "manufacturer",
        assetId: mfg2.id,
        acquiredWeek: 0,
        acquiredVia: "draft",
      },
      {
        teamId: team1.id,
        assetType: "cannabis_strain",
        assetId: strain1.id,
        acquiredWeek: 0,
        acquiredVia: "draft",
      },
      {
        teamId: team1.id,
        assetType: "cannabis_strain",
        assetId: strain2.id,
        acquiredWeek: 0,
        acquiredVia: "draft",
      },
      {
        teamId: team1.id,
        assetType: "product",
        assetId: product1.id,
        acquiredWeek: 0,
        acquiredVia: "draft",
      },
      {
        teamId: team1.id,
        assetType: "pharmacy",
        assetId: phm1.id,
        acquiredWeek: 0,
        acquiredVia: "draft",
      },
      {
        teamId: team1.id,
        assetType: "pharmacy",
        assetId: phm2.id,
        acquiredWeek: 0,
        acquiredVia: "draft",
      },
    ];

    for (const entry of rosterEntries) {
      await db.insert(rosters).values(entry);
    }

    console.log(`   ✅ Created ${rosterEntries.length} roster entries for Team 1`);
    console.log(`      - 2 Manufacturers: ${mfg1.name}, ${mfg2.name}`);
    console.log(`      - 2 Cannabis Strains: ${strain1.name}, ${strain2.name}`);
    console.log(`      - 1 Product: ${product1.name}`);
    console.log(`      - 2 Pharmacies: ${phm1.name}, ${phm2.name}`);
    console.log(`      - Missing: 1 Product, 1 Flex (can be drafted)`);

    // 6. Create empty lineup for Team 1, Week 1
    console.log("\n6️⃣ Creating lineup for Team 1, Week 1...");
    
    await db.insert(weeklyLineups).values({
      teamId: team1.id,
      year: 2025,
      week: 1,
      mfg1Id: mfg1.id,
      mfg2Id: mfg2.id,
      cstr1Id: strain1.id,
      cstr2Id: strain2.id,
      prd1Id: product1.id,
      prd2Id: null, // Empty slot
      phm1Id: phm1.id,
      phm2Id: phm2.id,
      flexId: null, // Empty slot
      flexType: null,
      isLocked: false,
    });

    console.log(`   ✅ Created lineup for Week 1 (7/9 positions filled)`);

    // 7. Summary
    console.log("\n✅ Seed script completed successfully!");
    console.log("\n📊 Test Data Summary:");
    console.log(`   League: ${league.name} (ID: ${league.id})`);
    console.log(`   Team 1: ${team1.name} (ID: ${team1.id}) - Your test team`);
    console.log(`   Team 2: ${team2.name} (ID: ${team2.id}) - Opponent`);
    console.log(`   Roster: 7/9 positions filled`);
    console.log(`   Lineup: Week 1 created (7/9 filled, unlocked)`);
    console.log("\n🧪 Test URLs:");
    console.log(`   Draft Board: /roster-test (use leagueId: ${league.id})`);
    console.log(`   Lineup Editor: /roster-test (use teamId: ${team1.id})`);
    console.log(`   Roster Display: /roster-test (use teamId: ${team1.id})`);
    console.log("\n🎯 Next Steps:");
    console.log(`   1. Navigate to /roster-test`);
    console.log(`   2. Test DraftBoard with leagueId: ${league.id}`);
    console.log(`   3. Test LineupEditor with teamId: ${team1.id}, year: 2025, week: 1`);
    console.log(`   4. Test RosterDisplay with teamId: ${team1.id}`);
    console.log(`   5. Draft remaining players (1 Product, 1 Flex)`);
    console.log(`   6. Complete and lock lineup`);

  } catch (error) {
    console.error("\n❌ Error during seeding:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

main()
  .then(() => {
    console.log("\n✅ Seed script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seed script failed:", error);
    process.exit(1);
  });
