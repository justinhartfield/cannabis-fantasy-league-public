import { getDb } from './db';
import { leagues, teams, weeklyTeamScores } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { calculateWeeklyScores } from './scoringEngine';
import { wsManager } from './websocket';

/**
 * Challenge Score Scheduler
 * 
 * Uses setInterval (free, runs in Node.js process) instead of external cron jobs
 * - Updates scores every hour at :00 for active challenges created today
 * - Finalizes challenges at midnight (00:00) for challenges from previous day
 */

class ChallengeScoreScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private lastUpdateHour: number = -1;
  private lastFinalizationDate: string = '';

  /**
   * Start the scheduler
   */
  start() {
    if (this.intervalId) {
      console.log('[ChallengeScoreScheduler] Already running');
      return;
    }

    // Check every minute
    this.intervalId = setInterval(() => {
      this.checkAndUpdate();
    }, 60000); // 60 seconds

    console.log('[ChallengeScoreScheduler] Started - checking every minute');
    
    // Run immediately on start
    this.checkAndUpdate();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ChallengeScoreScheduler] Stopped');
    }
  }

  /**
   * Check if updates are needed and execute them
   */
  private async checkAndUpdate() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check for hourly update (at :00 minutes)
    if (currentMinute === 0 && currentHour !== this.lastUpdateHour) {
      this.lastUpdateHour = currentHour;
      await this.updateHourlyScores();
    }

    // Check for midnight finalization (00:00)
    if (currentHour === 0 && currentMinute === 0 && currentDate !== this.lastFinalizationDate) {
      this.lastFinalizationDate = currentDate;
      await this.finalizeChallenges();
    }
  }

  /**
   * Update scores for active challenges created today
   */
  private async updateHourlyScores() {
    console.log('[ChallengeScoreScheduler] Running hourly score update...');

    const db = await getDb();
    if (!db) {
      console.error('[ChallengeScoreScheduler] Database not available');
      return;
    }

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      // Find all active challenges created today
      // Note: Using SQL comparison since drizzle-orm date comparisons can be tricky
      const allChallenges = await db
        .select()
        .from(leagues)
        .where(and(
          eq(leagues.leagueType, 'challenge'),
          eq(leagues.status, 'active')
        ));

      // Filter challenges created today
      const activeChallenges = allChallenges.filter(challenge => {
        const createdAt = new Date(challenge.createdAt);
        return createdAt >= todayStart && createdAt < todayEnd;
      });

      console.log(`[ChallengeScoreScheduler] Found ${activeChallenges.length} active challenges to update`);

      const year = now.getFullYear();
      const week = this.getWeekNumber(now);

      for (const challenge of activeChallenges) {
        try {
          console.log(`[ChallengeScoreScheduler] Updating scores for challenge ${challenge.id}`);
          
          await calculateWeeklyScores(challenge.id, year, week);

          // Get updated scores for broadcast
          const challengeTeams = await db
            .select()
            .from(teams)
            .where(eq(teams.leagueId, challenge.id));

          const scores = await Promise.all(
            challengeTeams.map(async (team) => {
              const [score] = await db
                .select()
                .from(weeklyTeamScores)
                .where(and(
                  eq(weeklyTeamScores.teamId, team.id),
                  eq(weeklyTeamScores.year, year),
                  eq(weeklyTeamScores.week, week)
                ))
                .limit(1);

              return {
                teamId: team.id,
                teamName: team.name,
                points: score?.totalPoints || 0,
              };
            })
          );

          // Broadcast score update via WebSocket
          wsManager.notifyChallengeScoreUpdate(challenge.id, {
            challengeId: challenge.id,
            year,
            week,
            scores,
            updateTime: now.toISOString(),
          });

          console.log(`[ChallengeScoreScheduler] Updated challenge ${challenge.id}`);
        } catch (error) {
          console.error(`[ChallengeScoreScheduler] Error updating challenge ${challenge.id}:`, error);
        }
      }

      console.log('[ChallengeScoreScheduler] Hourly score update complete');
    } catch (error) {
      console.error('[ChallengeScoreScheduler] Error in hourly update:', error);
    }
  }

  /**
   * Finalize challenges from previous day at midnight
   */
  private async finalizeChallenges() {
    console.log('[ChallengeScoreScheduler] Running midnight finalization...');

    const db = await getDb();
    if (!db) {
      console.error('[ChallengeScoreScheduler] Database not available');
      return;
    }

    try {
      const now = new Date();
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);

      // Find all active challenges created yesterday
      const allChallenges = await db
        .select()
        .from(leagues)
        .where(and(
          eq(leagues.leagueType, 'challenge'),
          eq(leagues.status, 'active')
        ));

      // Filter challenges created yesterday
      const challengesToFinalize = allChallenges.filter(challenge => {
        const createdAt = new Date(challenge.createdAt);
        return createdAt >= yesterdayStart && createdAt < yesterdayEnd;
      });

      console.log(`[ChallengeScoreScheduler] Found ${challengesToFinalize.length} challenges to finalize`);

      const year = now.getFullYear();
      const week = this.getWeekNumber(now);

      for (const challenge of challengesToFinalize) {
        try {
          console.log(`[ChallengeScoreScheduler] Finalizing challenge ${challenge.id}`);

          // Calculate final scores
          await calculateWeeklyScores(challenge.id, year, week);

          // Get final scores and determine winner
          const challengeTeams = await db
            .select()
            .from(teams)
            .where(eq(teams.leagueId, challenge.id));

          const finalScores = await Promise.all(
            challengeTeams.map(async (team) => {
              const [score] = await db
                .select()
                .from(weeklyTeamScores)
                .where(and(
                  eq(weeklyTeamScores.teamId, team.id),
                  eq(weeklyTeamScores.year, year),
                  eq(weeklyTeamScores.week, week)
                ))
                .limit(1);

              return {
                teamId: team.id,
                teamName: team.name,
                userId: team.userId,
                points: score?.totalPoints || 0,
              };
            })
          );

          // Sort by points descending to find winner
          finalScores.sort((a, b) => b.points - a.points);
          const winner = finalScores[0];

          // Update challenge status to complete
          await db
            .update(leagues)
            .set({
              status: 'complete',
            })
            .where(eq(leagues.id, challenge.id));

          // Broadcast finalization event via WebSocket
          wsManager.notifyChallengeFinalized(challenge.id, {
            challengeId: challenge.id,
            year,
            week,
            scores: finalScores.map(s => ({ teamId: s.teamId, teamName: s.teamName, points: s.points })),
            winner: {
              teamId: winner.teamId,
              teamName: winner.teamName,
              userId: winner.userId,
              points: winner.points,
            },
            finalizedAt: now.toISOString(),
          });

          console.log(`[ChallengeScoreScheduler] Finalized challenge ${challenge.id} - Winner: ${winner.teamName} (${winner.points} points)`);
        } catch (error) {
          console.error(`[ChallengeScoreScheduler] Error finalizing challenge ${challenge.id}:`, error);
        }
      }

      console.log('[ChallengeScoreScheduler] Midnight finalization complete');
    } catch (error) {
      console.error('[ChallengeScoreScheduler] Error in midnight finalization:', error);
    }
  }

  /**
   * Calculate scores on-demand (used when users visit challenge page)
   */
  async calculateChallengeScores(challengeId: number): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const [challenge] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, challengeId))
      .limit(1);

    if (!challenge || challenge.leagueType !== 'challenge') {
      throw new Error('Challenge not found');
    }

    const challengeDate = new Date(challenge.createdAt);
    const year = challengeDate.getFullYear();
    const week = this.getWeekNumber(challengeDate);

    await calculateWeeklyScores(challengeId, year, week);
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
}

export const challengeScoreScheduler = new ChallengeScoreScheduler();

