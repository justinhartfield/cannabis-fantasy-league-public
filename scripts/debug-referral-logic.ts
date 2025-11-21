import { getDb } from '../server/db';
import { users, referrals, teams, leagues } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { applyReferralCodeForUser, completeReferralIfEligible, getOrCreateReferralCode } from '../server/referralService';

async function runDebug() {
  console.log("🚀 Starting Referral Debug...");
  
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  // 1. Cleanup previous test data if exists
  console.log("🧹 Cleaning up test data...");
  const testReferrerEmail = 'test_referrer_debug@example.com';
  const testRefereeEmail = 'test_referee_debug@example.com';
  
  const [existingReferrer] = await db.select().from(users).where(eq(users.email, testReferrerEmail));
  const [existingReferee] = await db.select().from(users).where(eq(users.email, testRefereeEmail));

  if (existingReferee) {
    await db.delete(teams).where(eq(teams.userId, existingReferee.id));
    await db.delete(referrals).where(eq(referrals.referredUserId, existingReferee.id));
    await db.delete(users).where(eq(users.id, existingReferee.id));
  }
  if (existingReferrer) {
    await db.delete(referrals).where(eq(referrals.referrerUserId, existingReferrer.id));
    await db.delete(users).where(eq(users.id, existingReferrer.id));
  }

  // 2. Create Referrer
  console.log("👤 Creating Referrer...");
  const [referrer] = await db.insert(users).values({
    openId: 'debug_referrer_open_id',
    name: 'Debug Referrer',
    email: testReferrerEmail,
    referralCredits: 0,
    streakFreezeTokens: 0
  }).returning();

  // Generate code
  const referralCode = await getOrCreateReferralCode(referrer.id);
  console.log(`   Referrer ID: ${referrer.id}, Code: ${referralCode}`);

  if (!referralCode) {
    console.error("❌ Failed to generate referral code");
    process.exit(1);
  }

  // 3. Create Referee (New User)
  console.log("👤 Creating Referee...");
  const [referee] = await db.insert(users).values({
    openId: 'debug_referee_open_id',
    name: 'Debug Referee',
    email: testRefereeEmail,
  }).returning();
  console.log(`   Referee ID: ${referee.id}`);

  // 4. Apply Referral Code
  console.log(`🔗 Applying referral code ${referralCode} for Referee...`);
  const applyResult = await applyReferralCodeForUser(referee.id, referralCode);
  console.log(`   Result:`, applyResult);

  if (applyResult.status !== 'applied') {
    console.error("❌ Failed to apply referral code");
    process.exit(1);
  }

  // Check pending state
  const [pendingReferral] = await db.select().from(referrals).where(eq(referrals.referredUserId, referee.id));
  console.log(`   Referral Status: ${pendingReferral?.status} (Expected: pending)`);

  if (pendingReferral?.status !== 'pending') {
    console.error("❌ Referral should be pending");
    process.exit(1);
  }

  // 5. Simulate Joining a League
  console.log("🏆 Referee joining a league...");
  
  // Create a dummy league first if needed, or just insert a team directly
  const [league] = await db.insert(leagues).values({
    name: 'Debug League',
    commissionerUserId: referrer.id, // doesn't matter
    seasonYear: 2025,
    leagueCode: 'DEBUG1'
  }).returning();

  // Insert team
  await db.insert(teams).values({
    leagueId: league.id,
    userId: referee.id,
    name: 'Debug Team'
  });

  console.log("   Team created. Triggering completion logic...");
  
  // 6. Trigger Completion Logic manually (simulating leagueRouter call)
  await completeReferralIfEligible(referee.id);

  // 7. Verify Rewards
  console.log("✅ Verifying rewards...");
  
  const [updatedReferral] = await db.select().from(referrals).where(eq(referrals.referredUserId, referee.id));
  const [updatedReferrer] = await db.select().from(users).where(eq(users.id, referrer.id));

  console.log(`   Referral Status: ${updatedReferral?.status}`);
  console.log(`   Referrer Credits: ${updatedReferrer?.referralCredits}`);
  console.log(`   Referrer Freeze Tokens: ${updatedReferrer?.streakFreezeTokens}`);

  if (updatedReferral?.status === 'completed' && updatedReferrer?.referralCredits === 1) {
    console.log("🎉 SUCCESS: Referral completed and rewards granted.");
  } else {
    console.error("❌ FAILURE: Rewards not granted correctly.");
  }

  // Cleanup
  console.log("🧹 Final Cleanup...");
  await db.delete(teams).where(eq(teams.userId, referee.id));
  await db.delete(leagues).where(eq(leagues.id, league.id));
  await db.delete(referrals).where(eq(referrals.referredUserId, referee.id));
  await db.delete(users).where(eq(users.id, referee.id));
  await db.delete(users).where(eq(users.id, referrer.id));

  process.exit(0);
}

runDebug().catch(console.error);
