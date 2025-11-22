import { CronJob } from 'cron';
import { and, eq } from 'drizzle-orm';
import { getDb } from './db';
import { leagues } from '../drizzle/schema';
import { getDataSyncServiceV2 } from './services/dataSyncService';
import { calculateWeeklyScores } from './scoringEngine';

const DEFAULT_CRON = '0 0 3 * * *';

class SeasonScoringScheduler {
  private job: CronJob | null = null;
  private lastRunKey: string | null = null;

  start() {
    const enabled = process.env.ENABLE_SEASON_DAILY_SCORING !== 'false';
    if (!enabled) {
      console.log('[SeasonScoringScheduler] Disabled via ENABLE_SEASON_DAILY_SCORING');
      return;
    }

    if (this.job) {
      console.log('[SeasonScoringScheduler] Already running');
      return;
    }

    const cronExpression = process.env.SEASON_SCORING_CRON || DEFAULT_CRON;

    this.job = new CronJob(
      cronExpression,
      () => {
        this.runDailySeasonScoring().catch((error) => {
          console.error('[SeasonScoringScheduler] Error during scheduled run:', error);
        });
      },
      null,
      true,
      'Europe/Berlin'
    );

    console.log(`[SeasonScoringScheduler] Started (cron: ${cronExpression})`);
  }

  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('[SeasonScoringScheduler] Stopped');
    }
  }

  private async runDailySeasonScoring() {
    const now = new Date();
    const { year, week } = this.getIsoYearWeek(now);
    const runKey = `${year}-W${week}-${now.toISOString().split('T')[0]}`;

    if (this.lastRunKey === runKey) {
      console.log(`[SeasonScoringScheduler] Skipping run for ${runKey} (already processed today)`);
      return;
    }

    this.lastRunKey = runKey;

    const syncService = getDataSyncServiceV2();
    try {
      console.log(`[SeasonScoringScheduler] Syncing weekly stats for ${year}-W${week}`);
      await syncService.syncWeeklyStats(year, week);
    } catch (error) {
      console.error('[SeasonScoringScheduler] Failed to sync weekly stats:', error);
    }

    await this.scoreActiveSeasonLeagues(year, week);
  }

  private async scoreActiveSeasonLeagues(year: number, week: number) {
    const db = await getDb();
    if (!db) {
      console.error('[SeasonScoringScheduler] Database not available');
      return;
    }

    const activeLeagues = await db
      .select({
        id: leagues.id,
        name: leagues.name,
      })
      .from(leagues)
      .where(
        and(
          eq(leagues.leagueType, 'season'),
          eq(leagues.status, 'active')
        )
      );

    console.log(`[SeasonScoringScheduler] Calculating weekly scores for ${activeLeagues.length} leagues (${year}-W${week})`);

    for (const league of activeLeagues) {
      try {
        await calculateWeeklyScores(league.id, year, week);
        console.log(`[SeasonScoringScheduler] Completed scoring for league ${league.id} (${league.name})`);
      } catch (error) {
        console.error(`[SeasonScoringScheduler] Error scoring league ${league.id}:`, error);
      }
    }
  }

  private getIsoYearWeek(date: Date): { year: number; week: number } {
    const tempDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = tempDate.getUTCDay() || 7;
    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: tempDate.getUTCFullYear(), week };
  }
}

export const seasonScoringScheduler = new SeasonScoringScheduler();

