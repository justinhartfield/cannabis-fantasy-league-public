import { getDb } from './db';
import { leagues, teams, dailyTeamScores } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { calculateDailyChallengeScores } from './scoringEngine';
import { wsManager } from './websocket';
import { scoreBroadcaster } from './scoreBroadcaster';

/**
 * Challenge Score Scheduler
 * 
 * Checks every minute, runs score updates every 10 minutes (synced with stats aggregation)
 * Finalizes challenges at midnight
 */

class ChallengeScoreScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private lastUpdateKey: string = '';
  private lastFinalizationDate: string = '';

  start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.checkAndUpdate();
    }, 60000);

    console.log('[ChallengeScoreScheduler] Started: every 10 min');
    this.checkAndUpdate();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check if updates are needed and execute them
   */
  private async checkAndUpdate() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDate = now.toISOString().split('T')[0];

    // Check for 10-minute update (synced with stats aggregation)
    const updateKey = `${currentHour}:${currentMinute}`;
    const isUpdateTime = currentMinute % 10 === 0;
    
    if (isUpdateTime && updateKey !== this.lastUpdateKey) {
      this.lastUpdateKey = updateKey;
      await this.updateHourlyScores();
    }

    // Check for midnight finalization (00:00)
    if (currentHour === 0 && currentMinute === 0 && currentDate !== this.lastFinalizationDate) {
      this.lastFinalizationDate = currentDate;
      await this.finalizeChallenges();
    }
  }

  /**
   * Manually trigger score update for a specific challenge (for testing/admin)
   */
  async triggerChallengeUpdate(challengeId: number): Promise<number> {
    
    const db = await getDb();
    if (!db) {
      console.error('[ChallengeScoreScheduler] Database not available');
      return 0;
    }

    const [challenge] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, challengeId))
      .limit(1);

    if (!challenge || challenge.leagueType !== 'challenge') {
      console.error(`[ChallengeScoreScheduler] Challenge ${challengeId} not found`);
      return 0;
    }

    const statDateString = new Date(challenge.createdAt).toISOString().split('T')[0];
    
    // Calculate scores
    await calculateDailyChallengeScores(challengeId, statDateString);

    // Detect and broadcast scoring plays
    const playCount = await scoreBroadcaster.detectAndQueuePlays(
      challengeId,
      statDateString,
      5 // spread over 5 minutes for manual triggers
    );

    return playCount;
  }

  /**
   * Update scores for ALL active challenges (every 10 minutes)
   */
  private async updateHourlyScores() {
    const db = await getDb();
    if (!db) return;

    try {
      const activeChallenges = await db
        .select()
        .from(leagues)
        .where(and(
          eq(leagues.leagueType, 'challenge'),
          eq(leagues.status, 'active')
        ));

      for (const challenge of activeChallenges) {
        try {
          const statDateString = new Date(challenge.createdAt).toISOString().split('T')[0];
          await calculateDailyChallengeScores(challenge.id, statDateString);

          // Queue scoring plays for drip-feed broadcast over 10 minutes
          await scoreBroadcaster.detectAndQueuePlays(
            challenge.id,
            statDateString,
            10
          );
        } catch (error) {
          console.error(`[ChallengeScoreScheduler] Error challenge ${challenge.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[ChallengeScoreScheduler] Update error:', error);
    }
  }

  /**
   * Finalize challenges from previous day at midnight
   */
  private async finalizeChallenges() {
    const db = await getDb();
    if (!db) return;

    try {
      const now = new Date();
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterdayEnd = new Date(yesterdayStart);
      yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);

      const allChallenges = await db
        .select()
        .from(leagues)
        .where(and(
          eq(leagues.leagueType, 'challenge'),
          eq(leagues.status, 'active')
        ));

      const challengesToFinalize = allChallenges.filter(challenge => {
        const createdAt = new Date(challenge.createdAt);
        return createdAt >= yesterdayStart && createdAt < yesterdayEnd;
      });

      for (const challenge of challengesToFinalize) {
        try {
          // Calculate final scores
          const createdDate = new Date(challenge.createdAt);
          const statDateString = createdDate.toISOString().split('T')[0];
          const statYear = createdDate.getFullYear();
          const statWeek = this.getWeekNumber(createdDate);

          await calculateDailyChallengeScores(challenge.id, statDateString);

          const challengeTeams = await db
            .select()
            .from(teams)
            .where(eq(teams.leagueId, challenge.id));

          const finalScores = await Promise.all(
            challengeTeams.map(async (team) => {
              const [score] = await db
                .select()
                .from(dailyTeamScores)
                .where(and(
                  eq(dailyTeamScores.teamId, team.id),
                  eq(dailyTeamScores.challengeId, challenge.id),
                  eq(dailyTeamScores.statDate, statDateString)
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
            year: statYear,
            week: statWeek,
            statDate: statDateString,
            scores: finalScores.map(s => ({ teamId: s.teamId, teamName: s.teamName, points: s.points })),
            winner: {
              teamId: winner.teamId,
              teamName: winner.teamName,
              userId: winner.userId,
              points: winner.points,
            },
            finalizedAt: now.toISOString(),
          });

          scoreBroadcaster.clearChallenge(challenge.id);
          console.log(`[Scheduler] Finalized ${challenge.id}: ${winner.teamName} won`);
        } catch (error) {
          console.error(`[Scheduler] Finalize error ${challenge.id}:`, error);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Finalization error:', error);
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

    const statDateString = new Date(challenge.createdAt).toISOString().split('T')[0];

    await calculateDailyChallengeScores(challengeId, statDateString);
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

