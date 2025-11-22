import { generateDailyMatchups, scorePreviousDayMatchups } from './predictionService';
import { getDataSyncServiceV2 } from './services/dataSyncService';

/**
 * Prediction Streak Scheduler (No Cron Jobs - Free!)
 * 
 * Uses setInterval to check every hour if tasks need to run.
 * This approach is free on Render.com (no cron job charges).
 * 
 * Handles:
 * - Generating daily matchups at 12:00 AM UTC
 * - Syncing daily stats at 10:00 PM UTC (before scoring)
 * - Scoring previous day's matchups at 11:00 PM UTC
 */

let lastMatchupGenerationDate: string | null = null;
let lastStatsSyncDate: string | null = null;
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
 * Check if we need to sync daily stats for yesterday
 * This must run BEFORE scoring to ensure we have data to score with
 */
async function checkAndSyncStats() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Only sync once per day
  if (lastStatsSyncDate === today) {
    return;
  }
  
  // Check if it's past 10:00 PM UTC (1 hour before scoring)
  const hour = now.getUTCHours();
  if (hour >= 22) {
    console.log('[PredictionScheduler] Syncing daily stats for yesterday...');
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      const syncService = getDataSyncServiceV2();
      await syncService.syncDailyStats(yesterdayStr);
      
      lastStatsSyncDate = today;
      console.log('[PredictionScheduler] Daily stats sync completed');
    } catch (error) {
      console.error('[PredictionScheduler] Error syncing daily stats:', error);
    }
  }
}

/**
 * Check if we need to score yesterday's matchups
 * This runs AFTER stats sync to ensure we have data
 */
async function checkAndScoreMatchups() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  // Only score once per day
  if (lastScoringDate === today) {
    return;
  }
  
  // Check if it's past 11:00 PM UTC (1 hour after stats sync)
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
  await checkAndSyncStats(); // Sync stats first
  await checkAndScoreMatchups(); // Then score
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
  console.log('  - Daily stats sync: After 10:00 PM UTC');
  console.log('  - Scoring: After 11:00 PM UTC');
}

export default {
  initPredictionScheduler,
};
