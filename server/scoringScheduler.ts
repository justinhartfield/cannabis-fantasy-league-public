import { CronJob } from 'cron';
import { getDb } from './db';
import { leagues } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { calculateWeeklyScores } from './scoringEngine';
import { wsManager } from './websocket';

/**
 * Scoring Scheduler
 * 
 * Automatically calculates fantasy scores at the end of each week
 * Runs every Monday at 00:00 (start of new week)
 */

class ScoringScheduler {
  private job: CronJob | null = null;

  /**
   * Start the scoring scheduler
   */
  start() {
    if (this.job) {
      console.log('[ScoringScheduler] Already running');
      return;
    }

    // Run every Monday at 00:00
    // Cron format: second minute hour day-of-month month day-of-week
    this.job = new CronJob(
      '0 0 0 * * 1', // Every Monday at midnight
      async () => {
        await this.runWeeklyScoring();
      },
      null, // onComplete
      true, // start immediately
      'Europe/Berlin' // timezone
    );

    console.log('[ScoringScheduler] Started - will run every Monday at 00:00');
  }

  /**
   * Stop the scoring scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('[ScoringScheduler] Stopped');
    }
  }

  /**
   * Run scoring for all active leagues
   */
  async runWeeklyScoring() {
    console.log('[ScoringScheduler] Running weekly scoring...');

    try {
      const db = await getDb();
      if (!db) {
        console.error('[ScoringScheduler] Database not available');
        return;
      }

      // Get all active leagues
      const activeLeagues = await db
        .select()
        .from(leagues)
        .where(eq(leagues.status, 'active'));

      console.log(`[ScoringScheduler] Found ${activeLeagues.length} active leagues`);

      // Calculate current year and week
      const now = new Date();
      const year = now.getFullYear();
      const week = this.getWeekNumber(now);

      // Process each league
      for (const league of activeLeagues) {
        try {
          console.log(`[ScoringScheduler] Processing league ${league.id} (${league.name})`);
          
          await calculateWeeklyScores(league.id, year, week - 1); // Score previous week

          // Notify league members
          wsManager.broadcastToLeague(league.id, {
            type: 'scoring_complete',
            year,
            week: week - 1,
            timestamp: Date.now(),
          });

          console.log(`[ScoringScheduler] Completed league ${league.id}`);
        } catch (error) {
          console.error(`[ScoringScheduler] Error processing league ${league.id}:`, error);
        }
      }

      console.log('[ScoringScheduler] Weekly scoring complete');
    } catch (error) {
      console.error('[ScoringScheduler] Error running weekly scoring:', error);
    }
  }

  /**
   * Manually trigger scoring for a specific league and week
   */
  async triggerScoring(leagueId: number, year: number, week: number) {
    console.log(`[ScoringScheduler] Manual trigger for league ${leagueId}, ${year}-W${week}`);

    try {
      await calculateWeeklyScores(leagueId, year, week);

      wsManager.broadcastToLeague(leagueId, {
        type: 'scoring_complete',
        year,
        week,
        timestamp: Date.now(),
      });

      console.log(`[ScoringScheduler] Manual scoring complete for league ${leagueId}`);
    } catch (error) {
      console.error(`[ScoringScheduler] Error in manual scoring:`, error);
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

export const scoringScheduler = new ScoringScheduler();
