import { CronJob } from 'cron';
import { generateDailyMatchups, scorePreviousDayMatchups } from './predictionService';

/**
 * Prediction Streak Scheduler
 * 
 * Handles:
 * - Generating daily matchups at 12:00 AM UTC
 * - Scoring previous day's matchups at 11:59 PM UTC
 */

export function initPredictionScheduler() {
  console.log('[PredictionScheduler] Initializing...');

  // Generate new matchups at 12:00 AM UTC daily
  const generateMatchupsJob = new CronJob('0 0 * * *', async () => {
    console.log('[PredictionScheduler] Running daily matchup generation...');
    try {
      await generateDailyMatchups();
      console.log('[PredictionScheduler] Matchup generation completed');
    } catch (error) {
      console.error('[PredictionScheduler] Error generating matchups:', error);
    }
  });
  generateMatchupsJob.start();

  // Score previous day's matchups at 11:59 PM UTC daily
  const scoreMatchupsJob = new CronJob('59 23 * * *', async () => {
    console.log('[PredictionScheduler] Running previous day scoring...');
    try {
      await scorePreviousDayMatchups();
      console.log('[PredictionScheduler] Scoring completed');
    } catch (error) {
      console.error('[PredictionScheduler] Error scoring matchups:', error);
    }
  });
  scoreMatchupsJob.start();

  console.log('[PredictionScheduler] Scheduled:');
  console.log('  - Daily matchup generation: 12:00 AM UTC (0 0 * * *)');
  console.log('  - Previous day scoring: 11:59 PM UTC (59 23 * * *)');
}

export default {
  initPredictionScheduler,
};
