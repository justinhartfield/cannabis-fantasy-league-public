import { and, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { referrals, teams, users } from "../drizzle/schema";

/**
 * Generate a human-friendly referral code based on the user's name or email.
 * Falls back to a random alphanumeric code if needed.
 */
function generateReferralCodeBase(seed: string | null | undefined): string {
  const cleaned = (seed || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();

  const prefix = cleaned.slice(0, 8) || "CFL";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    .toString()
    .slice(-4);

  return `${prefix}${randomSuffix}`.slice(0, 12);
}

/**
 * Get or create a unique referral code for the given user.
 */
export async function getOrCreateReferralCode(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[ReferralService] Database not available");
    return null;
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    console.warn("[ReferralService] User not found for referral code generation", { userId });
    return null;
  }

  if (user.referralCode) {
    return user.referralCode;
  }

  let attempts = 0;
  let code: string | null = null;

  while (attempts < 5) {
    const candidate = generateReferralCodeBase(user.name || user.email || `USER${userId}`);
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, candidate))
      .limit(1);

    if (existing.length === 0) {
      code = candidate;
      break;
    }

    attempts += 1;
  }

  if (!code) {
    // Final fallback: purely random code
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    code = randomCode;
  }

  await db
    .update(users)
    .set({ referralCode: code })
    .where(eq(users.id, userId));

  return code;
}

/**
 * Apply a referral code for the current user.
 * - Only allowed if the user has not already been referred.
 * - Only allowed before the user joins any league (no teams yet).
 * - Creates or updates a pending referral record.
 */
export type ApplyReferralResult =
  | { status: "applied"; referrerId: number }
  | { status: "already_referred" }
  | { status: "already_has_teams" }
  | { status: "invalid_code" }
  | { status: "self_referral" }
  | { status: "user_not_found" }
  | { status: "db_unavailable" };

export async function applyReferralCodeForUser(
  currentUserId: number,
  code: string
): Promise<ApplyReferralResult> {
  const db = await getDb();
  if (!db) {
    console.warn("[ReferralService] Database not available");
    return { status: "db_unavailable" };
  }

  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, currentUserId))
    .limit(1);

  if (!currentUser) {
    console.warn("[ReferralService] Current user not found", { currentUserId });
    return { status: "user_not_found" };
  }

  if (currentUser.referredByUserId) {
    console.log("[ReferralService] User already has a referrer, skipping", {
      currentUserId,
      referredByUserId: currentUser.referredByUserId,
    });
    return { status: "already_referred" };
  }

  // Ensure the user hasn't already joined a league
  const userTeams = await db.select().from(teams).where(eq(teams.userId, currentUserId));
  if (userTeams.length > 0) {
    console.log("[ReferralService] User already has teams, referral no longer applicable", {
      currentUserId,
      teamCount: userTeams.length,
    });
    return { status: "already_has_teams" };
  }

  const [referrer] = await db
    .select()
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);

  if (!referrer) {
    console.warn("[ReferralService] Invalid referral code used", { code });
    return { status: "invalid_code" };
  }

  if (referrer.id === currentUserId) {
    console.warn("[ReferralService] User attempted self-referral, ignoring", {
      userId: currentUserId,
    });
    return { status: "self_referral" };
  }

  const referrerCode =
    referrer.referralCode || (await getOrCreateReferralCode(referrer.id)) || code;

  // Create or update a pending referral record for this user
  await db
    .insert(referrals)
    .values({
      referrerUserId: referrer.id,
      referredUserId: currentUserId,
      referralCode: referrerCode,
      status: "pending",
      trigger: "signup",
    })
    .onConflictDoUpdate({
      target: referrals.referredUserId,
      set: {
        referrerUserId: referrer.id,
        referralCode: referrerCode,
        status: "pending",
        trigger: "signup",
      },
    });

  // Mark user as referred
  await db
    .update(users)
    .set({ referredByUserId: referrer.id })
    .where(eq(users.id, currentUserId));

  console.log("[ReferralService] Applied referral code for user", {
    currentUserId,
    referrerId: referrer.id,
    code: referrerCode,
  });

  return { status: "applied", referrerId: referrer.id };
}

/**
 * Complete a pending referral when the referred user joins their first league.
 * - Only completes referrals with status = 'pending'.
 * - Only triggers once per referred user.
 * - Grants 1 referral credit and 1 streak freeze token to the referrer.
 */
export async function completeReferralIfEligible(referredUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[ReferralService] Database not available");
    return;
  }

  await db.transaction(async (tx) => {
    // Check for a pending referral
    const [pendingReferral] = await tx
      .select()
      .from(referrals)
      .where(
        and(
          eq(referrals.referredUserId, referredUserId),
          eq(referrals.status, "pending")
        )
      )
      .limit(1);

    if (!pendingReferral) {
      return;
    }

    // Ensure this is the user's first team (first league joined/created)
    const userTeams = await tx.select().from(teams).where(eq(teams.userId, referredUserId));
    if (userTeams.length === 0) {
      return;
    }

    // Mark referral as completed and grant rewards atomically
    await tx
      .update(referrals)
      .set({
        status: "completed",
        trigger: "join_league",
        completedAt: new Date().toISOString(),
      })
      .where(eq(referrals.id, pendingReferral.id));

    await tx
      .update(users)
      .set({
        referralCredits: sql`${users.referralCredits} + 1`,
        streakFreezeTokens: sql`${users.streakFreezeTokens} + 1`,
      })
      .where(eq(users.id, pendingReferral.referrerUserId));

    console.log("[ReferralService] Completed referral and granted rewards", {
      referredUserId,
      referrerUserId: pendingReferral.referrerUserId,
    });
  });
}

/**
 * Utility to get basic referral stats for a user.
 */
export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[ReferralService] Database not available");
    return {
      totalReferrals: 0,
      completedReferrals: 0,
    };
  }

  const [totals] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${referrals.status} = 'completed')`,
      total: sql<number>`count(*)`,
    })
    .from(referrals)
    .where(eq(referrals.referrerUserId, userId));

  return {
    totalReferrals: totals?.total ?? 0,
    completedReferrals: totals?.completed ?? 0,
  };
}


