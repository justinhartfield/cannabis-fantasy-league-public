import { getDb } from "../server/db";
import { users, referrals, teams, leagues } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { 
  applyReferralCodeForUser, 
  completeReferralIfEligible,
  getOrCreateReferralCode 
} from "../server/referralService";

async function debugReferralFlow() {
  console.log("🔍 Starting Referral Debug Script...");
  
  const db = await getDb();
  if (!db) {
    console.error("❌ Database connection failed");
    process.exit(1);
  }

  try {
    // 1. Setup Test Users
    const timestamp = Date.now();
    const referrerEmail = `referrer_${timestamp}@test.com`;
    const refereeEmail = `referee_${timestamp}@test.com`;
    const referralCode = `DEBUG${timestamp.toString().slice(-6)}`;

    console.log(`\n👤 Creating users...`);
    console.log(`   Referrer: ${referrerEmail}`);
    console.log(`   Referee: ${refereeEmail}`);
    console.log(`   Code: ${referralCode}`);

    // Create Referrer
    const [referrer] = await db.insert(users).values({
      openId: `referrer_${timestamp}`,
      email: referrerEmail,
      name: "Debug Referrer",
      referralCode: referralCode,
      referralCredits: 0,
      streakFreezeTokens: 0
    }).returning();

    // Create Referee
    const [referee] = await db.insert(users).values({
      openId: `referee_${timestamp}`,
      email: refereeEmail,
      name: "Debug Referee",
      referralCredits: 0,
      streakFreezeTokens: 0
    }).returning();

    // 2. Apply Referral Code
    console.log(`\n🔗 Applying referral code '${referralCode}' for referee...`);
    const applyResult = await applyReferralCodeForUser(referee.id, referralCode);
    console.log("   Result:", applyResult);

    // Verify 'referrals' table state
    const [referralRecord] = await db.select()
      .from(referrals)
      .where(eq(referrals.referredUserId, referee.id));
    
    console.log("   Referral Record:", referralRecord ? {
      status: referralRecord.status,
      trigger: referralRecord.trigger,
      referrerId: referralRecord.referrerUserId,
      code: referralRecord.referralCode
    } : "NOT FOUND");

    if (!referralRecord || referralRecord.status !== 'pending') {
      console.error("❌ Referral application failed or status incorrect");
    }

    // 3. Simulate League Join / Team Creation
    console.log(`\n🏆 Simulating League Join...`);
    
    // Create a dummy league
    const [league] = await db.insert(leagues).values({
      name: `Debug League ${timestamp}`,
      commissionerUserId: referrer.id,
      seasonYear: 2025,
      leagueCode: `L${timestamp.toString().slice(-5)}`
    }).returning();

    console.log(`   Created League: ${league.id}`);

    // Referee joins league (creates team)
    // IMPORTANT: This mimics leagueRouter.join logic order
    console.log(`   Referee creating team...`);
    const [team] = await db.insert(teams).values({
      leagueId: league.id,
      userId: referee.id,
      name: "Debug Team"
    }).returning();
    console.log(`   Team created: ${team.id}`);

    // 4. Trigger Completion Logic
    console.log(`   Triggering completeReferralIfEligible(${referee.id})...`);
    await completeReferralIfEligible(referee.id);

    // 5. Verify Rewards
    console.log(`\n✨ Verifying Rewards...`);
    
    const [updatedReferrer] = await db.select()
      .from(users)
      .where(eq(users.id, referrer.id));

    const [updatedReferral] = await db.select()
      .from(referrals)
      .where(eq(referrals.id, referralRecord.id));

    console.log("   Referrer Credits:", updatedReferrer.referralCredits);
    console.log("   Referrer Freeze Tokens:", updatedReferrer.streakFreezeTokens);
    console.log("   Referral Status:", updatedReferral.status);

    if (updatedReferrer.streakFreezeTokens === 1 && updatedReferral.status === 'completed') {
      console.log("\n✅ SUCCESS: Referral flow working correctly in isolation.");
    } else {
      console.error("\n❌ FAILURE: Rewards not granted or status not updated.");
    }

  } catch (error) {
    console.error("\n❌ Unexpected Error:", error);
  } finally {
    // Cleanup could go here, but for debug script we might want to inspect DB
    process.exit(0);
  }
}

debugReferralFlow();

