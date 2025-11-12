/**
 * Calculate Scores Script
 * 
 * Manually trigger scoring calculation for a league and week.
 */

import 'dotenv/config';
import { calculateWeeklyScores } from '../server/scoringEngine.js';

// Get current year and week
function getCurrentYearWeek(): { year: number; week: number } {
  const now = new Date();
  const year = now.getFullYear();
  
  // Calculate ISO week number
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (now.getTime() - firstDayOfYear.getTime()) / 86400000;
  const week = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  
  return { year, week };
}

async function main() {
  // Get league ID from command line args or use default
  const leagueId = process.argv[2] ? parseInt(process.argv[2]) : 4;
  const { year, week } = getCurrentYearWeek();
  
  console.log(`🏆 Calculating scores for League ${leagueId}, ${year}-W${week}...\n`);
  
  try {
    await calculateWeeklyScores(leagueId, year, week);
    console.log('\n✅ Scoring calculation complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Scoring calculation failed:', error);
    process.exit(1);
  }
}

main();
