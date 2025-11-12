import cron from 'node-cron';
import { getDb } from './db';
import { leagues, teams, users } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { sendDailyChallengeReminder } from './emailService';

/**
 * Daily Challenge Scheduler
 * 
 * Handles:
 * - Auto-creating daily challenges at 8:00 AM CET
 * - Sending reminder emails at 4:20 PM CET
 * - Scoring completed challenges
 */

/**
 * Generate a unique challenge name for today
 */
function generateChallengeName(): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  return `Daily Challenge - ${dateStr}`;
}

/**
 * Generate a random 6-character alphanumeric league code
 */
function generateLeagueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new daily challenge
 * Runs daily at 8:00 AM CET
 */
async function createDailyChallenge() {
  console.log('[DailyChallengeScheduler] Creating new daily challenge...');
  
  const db = await getDb();
  if (!db) {
    console.error('[DailyChallengeScheduler] Database not available');
    return;
  }

  try {
    // Generate unique league code
    let leagueCode = generateLeagueCode();
    let codeExists = true;
    
    while (codeExists) {
      const existing = await db.select().from(leagues).where(eq(leagues.leagueCode, leagueCode)).limit(1);
      if (existing.length === 0) {
        codeExists = false;
      } else {
        leagueCode = generateLeagueCode();
      }
    }

    const currentYear = new Date().getFullYear();
    const currentWeek = Math.ceil((Date.now() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

    // Create challenge league
    const [challenge] = await db
      .insert(leagues)
      .values({
        name: generateChallengeName(),
        leagueCode: leagueCode,
        commissionerUserId: 1, // System user
        teamCount: 2, // 2 players per challenge
        draftType: 'none', // No draft for challenges
        scoringType: 'standard',
        playoffTeams: 0, // No playoffs for challenges
        seasonYear: currentYear,
        currentWeek: currentWeek,
        status: 'active', // Skip draft, go straight to active
        leagueType: 'challenge',
        draftStarted: 1,
        draftCompleted: 1,
      })
      .returning({ id: leagues.id });

    console.log(`[DailyChallengeScheduler] Created daily challenge: ${challenge.id} (${leagueCode})`);
    
    return challenge.id;
  } catch (error) {
    console.error('[DailyChallengeScheduler] Error creating daily challenge:', error);
  }
}

/**
 * Send reminder emails to all challenge participants
 * Runs daily at 4:20 PM CET
 */
async function sendChallengeReminders() {
  console.log('[DailyChallengeScheduler] Sending challenge reminders...');
  
  const db = await getDb();
  if (!db) {
    console.error('[DailyChallengeScheduler] Database not available');
    return;
  }

  try {
    // Find all active challenges
    const activeChallenges = await db
      .select()
      .from(leagues)
      .where(and(
        eq(leagues.leagueType, 'challenge'),
        eq(leagues.status, 'active')
      ));

    console.log(`[DailyChallengeScheduler] Found ${activeChallenges.length} active challenges`);

    // For each challenge, send reminders to all participants
    for (const challenge of activeChallenges) {
      const challengeTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.leagueId, challenge.id));

      for (const team of challengeTeams) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, team.userId))
          .limit(1);

        if (user && user.email) {
          await sendDailyChallengeReminder({
            toEmail: user.email,
            toName: user.name || 'Player',
            leagueName: challenge.name,
            leagueId: challenge.id,
          });
          
          console.log(`[DailyChallengeScheduler] Sent reminder to ${user.email}`);
        }
      }
    }
  } catch (error) {
    console.error('[DailyChallengeScheduler] Error sending reminders:', error);
  }
}

/**
 * Initialize daily challenge scheduler
 */
export function initDailyChallengeScheduler() {
  console.log('[DailyChallengeScheduler] Initializing...');

  // Create new daily challenge at 8:00 AM CET (7:00 AM UTC in winter, 6:00 AM UTC in summer)
  // Using 7:00 AM UTC for simplicity
  cron.schedule('0 7 * * *', async () => {
    console.log('[DailyChallengeScheduler] Running daily challenge creation...');
    await createDailyChallenge();
  });

  // Send reminder emails at 4:20 PM CET (3:20 PM UTC in winter, 2:20 PM UTC in summer)
  // Using 3:20 PM UTC for simplicity
  cron.schedule('20 15 * * *', async () => {
    console.log('[DailyChallengeScheduler] Running reminder emails...');
    await sendChallengeReminders();
  });

  console.log('[DailyChallengeScheduler] Scheduled:');
  console.log('  - Daily challenge creation: 8:00 AM CET (7:00 AM UTC)');
  console.log('  - Reminder emails: 4:20 PM CET (3:20 PM UTC)');
}

export default {
  initDailyChallengeScheduler,
  createDailyChallenge,
  sendChallengeReminders,
};
