/**
 * Daily Stats Scheduler
 * 
 * Runs every 10 minutes to aggregate stats from Metabase into local database
 * for challenge scoring. This ensures real-time score updates for live games.
 */

import cron from 'node-cron';
import { DailyChallengeAggregatorV2 } from './dailyChallengeAggregatorV2';

const dailyChallengeAggregatorV2 = new DailyChallengeAggregatorV2();

export class DailyStatsScheduler {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the daily stats aggregation scheduler
   */
  start() {
    console.log('[DailyStatsScheduler] Started: every 10 min');

    this.cronJob = cron.schedule(
      '*/10 * * * *', // Every 10 minutes
      async () => {
        await this.runDailyAggregation();
      },
      {
        scheduled: true,
        timezone: 'Europe/Berlin',
      }
    );
  }

  /**
   * Run stats aggregation for today and yesterday
   */
  async runDailyAggregation() {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      await dailyChallengeAggregatorV2.aggregateForDate(todayStr);

      // Also aggregate yesterday to ensure finalization
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      await dailyChallengeAggregatorV2.aggregateForDate(yesterdayStr);
    } catch (error) {
      console.error('[DailyStatsScheduler] Aggregation failed:', error);
    }
  }

  /**
   * Manually trigger aggregation for a specific date
   */
  async aggregateForDate(statDate: string) {
    try {
      await dailyChallengeAggregatorV2.aggregateForDate(statDate);
    } catch (error) {
      console.error(`[DailyStatsScheduler] Failed for ${statDate}:`, error);
      throw error;
    }
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
    }
  }
}

// Singleton instance
let schedulerInstance: DailyStatsScheduler | null = null;

export function getDailyStatsScheduler(): DailyStatsScheduler {
  if (!schedulerInstance) {
    schedulerInstance = new DailyStatsScheduler();
  }
  return schedulerInstance;
}
