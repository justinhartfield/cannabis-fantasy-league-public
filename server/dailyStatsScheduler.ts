/**
 * Daily Stats Scheduler
 * 
 * Runs every hour to aggregate stats from Metabase into local database
 * for challenge scoring. This ensures stats are updated frequently throughout
 * the day without requiring expensive external cron jobs.
 */

import cron from 'node-cron';
import { dailyChallengeAggregator } from './dailyChallengeAggregator';

export class DailyStatsScheduler {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the daily stats aggregation scheduler
   * Runs every hour to keep stats up-to-date throughout the day
   */
  start() {
    console.log('[DailyStatsScheduler] Initializing...');

    // Schedule stats aggregation every hour
    this.cronJob = cron.schedule(
      '0 * * * *', // Every hour at minute 0
      async () => {
        await this.runDailyAggregation();
      },
      {
        scheduled: true,
        timezone: 'Europe/Berlin',
      }
    );

    console.log('[DailyStatsScheduler] Scheduled:');
    console.log('  - Daily stats aggregation: Every hour (on the hour) CET');
    console.log('[DailyStatsScheduler] Started');
  }

  /**
   * Run stats aggregation for today and yesterday
   * This ensures we capture both ongoing today's stats and finalize yesterday's
   */
  async runDailyAggregation() {
    try {
      // Aggregate for today (ongoing stats)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      console.log(`[DailyStatsScheduler] Starting aggregation for today (${todayStr})...`);
      await dailyChallengeAggregator.aggregateForDate(todayStr);
      console.log(`[DailyStatsScheduler] ✅ Today's aggregation complete`);

      // Also aggregate for yesterday to ensure it's finalized
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      console.log(`[DailyStatsScheduler] Starting aggregation for yesterday (${yesterdayStr})...`);
      await dailyChallengeAggregator.aggregateForDate(yesterdayStr);
      console.log(`[DailyStatsScheduler] ✅ Yesterday's aggregation complete`);
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
      await dailyChallengeAggregator.aggregateForDate(statDate);
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
