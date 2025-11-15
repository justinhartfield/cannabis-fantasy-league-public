import { generateDailyMatchups, scorePreviousDayMatchups } from './predictionService';

/**
 * Prediction Streak Scheduler (No Cron Jobs - Free!)
 * 
 * Uses setInterval to check every hour if tasks need to run.
 * This approach is free on Render.com (no cron job charges).
 * 
 * Handles:
 * - Generating daily matchups at 12:00 AM UTC
 * - Scoring previous day's matchups at 11:59 PM UTC
 */

let lastMatchupGenerationDate: string | null = null;
let lastScoringDate: string | null = null;

/**
 * Check if we need to generate matchups for today
 */
async function checkAndGenerateMatchups() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Only generate once per day
  if (lastMatchupGenerationDate === today) {
    return;
  }
  
  // Check if it's past midnight UTC
  const hour = now.getUTCHours();
  if (hour >= 0) {
    console.log('[PredictionScheduler] Generating daily matchups...');
    try {
      await generateDailyMatchups();
      lastMatchupGenerationDate = today;
      console.log('[PredictionScheduler] Matchup generation completed');
    } catch (error) {
      console.error('[PredictionScheduler] Error generating matchups:', error);
    }
  }
}

/**
 * Check if we need to score yesterday's matchups
 */
async function checkAndScoreMatchups() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Only score once per day
  if (lastScoringDate === today) {
    return;
  }
  
  // Check if it's past 11:00 PM UTC (give 1 hour window before midnight)
  const hour = now.getUTCHours();
  if (hour >= 23) {
    console.log('[PredictionScheduler] Scoring previous day matchups...');
    try {
      await scorePreviousDayMatchups();
      lastScoringDate = today;
      console.log('[PredictionScheduler] Scoring completed');
    } catch (error) {
      console.error('[PredictionScheduler] Error scoring matchups:', error);
    }
  }
}

/**
 * Main scheduler loop - checks every hour
 */
async function schedulerLoop() {
  await checkAndGenerateMatchups();
  await checkAndScoreMatchups();
}

export function initPredictionScheduler() {
  console.log('[PredictionScheduler] Initializing (interval-based, no cron)...');
  
  // Run immediately on startup
  schedulerLoop().catch(err => {
    console.error('[PredictionScheduler] Error in initial run:', err);
  });
  
  // Then check every hour (3600000 ms)
  setInterval(() => {
    schedulerLoop().catch(err => {
      console.error('[PredictionScheduler] Error in scheduler loop:', err);
    });
  }, 3600000); // 1 hour
  
  console.log('[PredictionScheduler] Scheduled to check every hour');
  console.log('  - Matchup generation: After 12:00 AM UTC');
  console.log('  - Scoring: After 11:00 PM UTC');
}

export default {
  initPredictionScheduler,
};
