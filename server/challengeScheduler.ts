import { CronJob } from 'cron';
import { getDb } from './db';
import { challenges, challengeParticipants } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Challenge Scheduler
 * 
 * Automatically creates daily challenges and calculates scores
 */

class ChallengeScheduler {
  private createJob: CronJob | null = null;
  private scoringJob: CronJob | null = null;

  /**
   * Start the challenge scheduler
   */
  start() {
    if (this.createJob && this.scoringJob) {
      console.log('[ChallengeScheduler] Already running');
      return;
    }

    // Create new challenge every day at 08:00
    this.createJob = new CronJob(
      '0 0 8 * * *', // Every day at 8:00 AM
      async () => {
        await this.createDailyChallenge();
      },
      null,
      true,
      'Europe/Berlin'
    );

    // Calculate scores for completed challenges every Monday at 01:00
    this.scoringJob = new CronJob(
      '0 0 1 * * 1', // Every Monday at 1:00 AM
      async () => {
        await this.scoreCompletedChallenges();
      },
      null,
      true,
      'Europe/Berlin'
    );

    console.log('[ChallengeScheduler] Started');
    console.log('[ChallengeScheduler] - Daily challenge creation: Every day at 08:00');
    console.log('[ChallengeScheduler] - Challenge scoring: Every Monday at 01:00');
  }

  /**
   * Stop the challenge scheduler
   */
  stop() {
    if (this.createJob) {
      this.createJob.stop();
      this.createJob = null;
    }
    if (this.scoringJob) {
      this.scoringJob.stop();
      this.scoringJob = null;
    }
    console.log('[ChallengeScheduler] Stopped');
  }

  /**
   * Create a new daily challenge
   */
  async createDailyChallenge() {
    console.log('[ChallengeScheduler] Creating daily challenge...');

    try {
      const db = await getDb();
      if (!db) {
        console.error('[ChallengeScheduler] Database not available');
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const week = this.getWeekNumber(now);

      // Check if challenge already exists for this week
      const existing = await db
        .select()
        .from(challenges)
        .where(
          and(
            eq(challenges.year, year),
            eq(challenges.week, week)
          )
        );

      if (existing && existing.length > 0) {
        console.log(`[ChallengeScheduler] Challenge already exists for ${year}-W${week}`);
        return;
      }

      // Create new challenge
      const draftStartTime = new Date();
      draftStartTime.setHours(draftStartTime.getHours() + 2); // Draft starts 2 hours after creation

      const challenge = await db
        .insert(challenges)
        .values({
          name: `Week ${week} Challenge`,
          description: `Daily challenge for week ${week}, ${year}`,
          year,
          week,
          status: 'open',
          maxParticipants: 10,
          draftRounds: 5,
          draftStartTime: draftStartTime.toISOString(),
          createdAt: new Date().toISOString(),
        })
        .returning();

      console.log(`[ChallengeScheduler] Created challenge ${challenge[0].id} for ${year}-W${week}`);
    } catch (error) {
      console.error('[ChallengeScheduler] Error creating daily challenge:', error);
    }
  }

  /**
   * Score all completed challenges
   */
  async scoreCompletedChallenges() {
    console.log('[ChallengeScheduler] Scoring completed challenges...');

    try {
      const db = await getDb();
      if (!db) {
        console.error('[ChallengeScheduler] Database not available');
        return;
      }

      const now = new Date();
      const year = now.getFullYear();
      const week = this.getWeekNumber(now);

      // Get all active challenges from previous week
      const activeChallenges = await db
        .select()
        .from(challenges)
        .where(
          and(
            eq(challenges.year, year),
            eq(challenges.week, week - 1),
            eq(challenges.status, 'active')
          )
        );

      console.log(`[ChallengeScheduler] Found ${activeChallenges.length} active challenges to score`);

      // Note: Scoring logic would be called here via tRPC or direct import
      // For now, just log the challenges that need scoring
      for (const challenge of activeChallenges) {
        console.log(`[ChallengeScheduler] Challenge ${challenge.id} needs scoring`);
        // TODO: Call scoring endpoint
        // await challengeScoringRouter.calculateChallengeScores({ challengeId: challenge.id });
      }

      console.log('[ChallengeScheduler] Challenge scoring complete');
    } catch (error) {
      console.error('[ChallengeScheduler] Error scoring challenges:', error);
    }
  }

  /**
   * Manually create a challenge
   */
  async manualCreateChallenge(year: number, week: number) {
    console.log(`[ChallengeScheduler] Manual challenge creation for ${year}-W${week}`);

    try {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const draftStartTime = new Date();
      draftStartTime.setHours(draftStartTime.getHours() + 2);

      const challenge = await db
        .insert(challenges)
        .values({
          name: `Week ${week} Challenge`,
          description: `Challenge for week ${week}, ${year}`,
          year,
          week,
          status: 'open',
          maxParticipants: 10,
          draftRounds: 5,
          draftStartTime: draftStartTime.toISOString(),
          createdAt: new Date().toISOString(),
        })
        .returning();

      console.log(`[ChallengeScheduler] Created challenge ${challenge[0].id}`);
      return challenge[0];
    } catch (error) {
      console.error('[ChallengeScheduler] Error in manual challenge creation:', error);
      throw error;
    }
  }

  /**
   * Get ISO week number for a date
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Get current year and week
   */
  getCurrentYearWeek(): { year: number; week: number } {
    const now = new Date();
    return {
      year: now.getFullYear(),
      week: this.getWeekNumber(now),
    };
  }
}

export const challengeScheduler = new ChallengeScheduler();
