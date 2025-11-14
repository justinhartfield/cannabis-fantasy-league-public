/**
 * Daily Stats Scheduler
 * 
 * Runs daily at 1:00 AM CET to aggregate previous day's stats
 * from Metabase into local database for challenge scoring.
 */

import cron from 'node-cron';
import { dailyStatsAggregator } from './dailyStatsAggregator-v2';

export class DailyStatsScheduler {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the daily stats aggregation scheduler
   * Runs at 1:00 AM CET (00:00 AM UTC) every day
   */
  start() {
    console.log('[DailyStatsScheduler] Initializing...');

    // Schedule daily stats aggregation at 1:00 AM CET (00:00 AM UTC)
    this.cronJob = cron.schedule(
      '0 1 * * *', // Every day at 1:00 AM
      async () => {
        await this.runDailyAggregation();
      },
      {
        scheduled: true,
        timezone: 'Europe/Berlin',
      }
    );

    console.log('[DailyStatsScheduler] Scheduled:');
    console.log('  - Daily stats aggregation: 1:00 AM CET (00:00 AM UTC)');
    console.log('[DailyStatsScheduler] Started');
  }

  /**
   * Run daily stats aggregation for yesterday's date
   */
  async runDailyAggregation() {
    try {
      // Get yesterday's date (since we run at 1 AM, aggregate previous day)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const statDate = yesterday.toISOString().split('T')[0];

      console.log(`[DailyStatsScheduler] Starting aggregation for ${statDate}...`);

      await dailyStatsAggregator.aggregateForDate(statDate);

      console.log(`[DailyStatsScheduler] ✅ Aggregation complete for ${statDate}`);
    } catch (error) {
      console.error('[DailyStatsScheduler] ❌ Aggregation failed:', error);
    }
  }

  /**
   * Manually trigger aggregation for a specific date
   */
  async aggregateForDate(statDate: string) {
    console.log(`[DailyStatsScheduler] Manual aggregation triggered for ${statDate}`);
    
    try {
      await dailyStatsAggregator.aggregateForDate(statDate);
      console.log(`[DailyStatsScheduler] ✅ Manual aggregation complete for ${statDate}`);
    } catch (error) {
      console.error(`[DailyStatsScheduler] ❌ Manual aggregation failed for ${statDate}:`, error);
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('[DailyStatsScheduler] Stopped');
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
