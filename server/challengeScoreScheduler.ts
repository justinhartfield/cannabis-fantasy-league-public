import { getDb } from './db';
import { leagues, teams, dailyTeamScores } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { calculateDailyChallengeScores } from './scoringEngine';
import { wsManager } from './websocket';
import { scoreBroadcaster } from './scoreBroadcaster';
import halftimeService from './halftimeService';
import overtimeService from './overtimeService';

/**
 * Challenge Score Scheduler
 * 
 * Handles timing-based events for daily challenges:
 * - Score updates every 10 minutes
 * - Halftime snapshots at 4:20 PM (or midpoint for non-24h games)
 * - Overtime triggers when scores are within 50 points at end time
 * - Golden Goal wins when 25-point lead achieved in OT
 * - Challenge finalization at configured end time
 */

class ChallengeScoreScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private lastUpdateKey: string = '';
  private lastFinalizationDate: string = '';
  private processedHalftimes: Set<number> = new Set();
  private processedEndTimes: Set<number> = new Set();

  start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.checkAndUpdate();
    }, 60000); // Check every minute

    console.log('[ChallengeScoreScheduler] Started: checking halftime/OT every minute, scores every 10 min');
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

    // Check halftime and overtime every minute
    await this.checkHalftimeEvents();
    await this.checkOvertimeEvents();
    await this.checkEndTimeEvents();

    // Check for midnight finalization (legacy fallback for non-configured challenges)
    if (currentHour === 0 && currentMinute === 0 && currentDate !== this.lastFinalizationDate) {
      this.lastFinalizationDate = currentDate;
      await this.finalizeChallenges();
    }
  }

  /**
   * Check for halftime events across all active challenges
   */
  private async checkHalftimeEvents() {
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

      const now = new Date();

      for (const challenge of activeChallenges) {
        // Skip if already processed halftime or no halftime set
        if (challenge.isHalftimePassed || !challenge.halftimeAt) continue;
        if (this.processedHalftimes.has(challenge.id)) continue;

        const halftimeAt = new Date(challenge.halftimeAt);
        
        if (now >= halftimeAt) {
          console.log(`[Scheduler] 🌿 Halftime triggered for challenge ${challenge.id}`);
          await halftimeService.takeHalftimeSnapshot(challenge.id);
          this.processedHalftimes.add(challenge.id);

          // Broadcast Power Hour start if applicable (4:15-4:25 PM for 24h games)
          if (challenge.durationHours === 24 && halftimeService.isInPowerHour(24)) {
            wsManager.notifyChallenge(challenge.id, 'power_hour', {
              type: 'power_hour_start',
              multiplier: 2.0,
              message: '🔥 POWER HOUR! 2x points for 10 minutes!'
            });
          }
        }
      }
    } catch (error) {
      console.error('[Scheduler] Halftime check error:', error);
    }
  }

  /**
   * Check for end time events and overtime triggers
   */
  private async checkEndTimeEvents() {
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

      const now = new Date();

      for (const challenge of activeChallenges) {
        // Skip if in overtime or already processed
        if (challenge.isInOvertime) continue;
        if (this.processedEndTimes.has(challenge.id)) continue;
        if (!challenge.challengeEndTime) continue;

        const endTime = new Date(challenge.challengeEndTime);
        
        if (now >= endTime) {
          console.log(`[Scheduler] End time reached for challenge ${challenge.id}`);
          this.processedEndTimes.add(challenge.id);

          // Check if overtime should trigger
          const shouldOT = await overtimeService.shouldTriggerOvertime(challenge.id);
          
          if (shouldOT) {
            console.log(`[Scheduler] ⚡ Overtime triggered for challenge ${challenge.id}`);
            await overtimeService.startOvertime(challenge.id);
          } else {
            // No overtime - finalize normally
            await this.finalizeChallenge(challenge.id);
          }
        }
      }
    } catch (error) {
      console.error('[Scheduler] End time check error:', error);
    }
  }

  /**
   * Check for overtime events (Golden Goal wins, timeout)
   */
  private async checkOvertimeEvents() {
    const db = await getDb();
    if (!db) return;

    try {
      const overtimeChallenges = await db
        .select()
        .from(leagues)
        .where(and(
          eq(leagues.leagueType, 'challenge'),
          eq(leagues.status, 'active'),
          eq(leagues.isInOvertime, true)
        ));

      for (const challenge of overtimeChallenges) {
        // Check for Golden Goal win
        const goldenGoalResult = await overtimeService.checkGoldenGoalWin(challenge.id);
        if (goldenGoalResult) {
          console.log(`[Scheduler] ⚡ Golden Goal: ${goldenGoalResult.winnerTeamName} wins challenge ${challenge.id}`);
          scoreBroadcaster.clearChallenge(challenge.id);
          continue;
        }

        // Check for overtime timeout
        if (challenge.overtimeEndTime) {
          const now = new Date();
          const otEnd = new Date(challenge.overtimeEndTime);
          
          if (now >= otEnd) {
            console.log(`[Scheduler] Overtime timeout for challenge ${challenge.id}`);
            const result = await overtimeService.handleOvertimeTimeout(challenge.id);
            if (result) {
              console.log(`[Scheduler] OT resolved: ${result.winnerTeamName} wins (${result.winCondition})`);
            }
            scoreBroadcaster.clearChallenge(challenge.id);
          }
        }
      }
    } catch (error) {
      console.error('[Scheduler] Overtime check error:', error);
    }
  }

  /**
   * Finalize a specific challenge
   */
  private async finalizeChallenge(challengeId: number) {
    const db = await getDb();
    if (!db) return;

    try {
      const [challenge] = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, challengeId))
        .limit(1);

      if (!challenge) return;

      const statDateString = challenge.challengeStartTime 
        ? new Date(challenge.challengeStartTime).toISOString().split('T')[0]
        : new Date(challenge.createdAt).toISOString().split('T')[0];

      await calculateDailyChallengeScores(challengeId, statDateString);

      const challengeTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.leagueId, challengeId));

      const finalScores = await Promise.all(
        challengeTeams.map(async (team) => {
          const [score] = await db
            .select()
            .from(dailyTeamScores)
            .where(and(
              eq(dailyTeamScores.teamId, team.id),
              eq(dailyTeamScores.challengeId, challengeId),
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

      finalScores.sort((a, b) => b.points - a.points);
      const winner = finalScores[0];

      await db
        .update(leagues)
        .set({
          status: 'complete',
          updatedAt: new Date().toISOString()
        })
        .where(eq(leagues.id, challengeId));

      const now = new Date();
      const statYear = now.getFullYear();
      const statWeek = this.getWeekNumber(now);

      wsManager.notifyChallengeFinalized(challengeId, {
        challengeId,
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

      scoreBroadcaster.clearChallenge(challengeId);
      console.log(`[Scheduler] Finalized ${challengeId}: ${winner.teamName} won with ${winner.points} points`);
    } catch (error) {
      console.error(`[Scheduler] Finalize error ${challengeId}:`, error);
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
          // Use challengeStartTime if set, otherwise fall back to createdAt
          const statDateString = challenge.challengeStartTime 
            ? new Date(challenge.challengeStartTime).toISOString().split('T')[0]
            : new Date(challenge.createdAt).toISOString().split('T')[0];

          // Get Power Hour multiplier (2x during 4:15-4:25 PM for 24h games)
          const powerHourMultiplier = halftimeService.getPowerHourMultiplier(challenge.durationHours || 24);
          
          // Calculate scores with optional multiplier
          await calculateDailyChallengeScores(challenge.id, statDateString, powerHourMultiplier);

          // Broadcast Power Hour status if active
          if (powerHourMultiplier > 1) {
            wsManager.notifyChallenge(challenge.id, 'power_hour_active', {
              type: 'power_hour_active',
              multiplier: powerHourMultiplier,
              message: '🔥 Power Hour active! 2x points!'
            });
          }

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
   * Finalize challenges from previous day at midnight (legacy fallback)
   * This handles challenges without configured endTime
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

      // Only finalize challenges WITHOUT configured end times (legacy behavior)
      // Challenges with endTime are handled by checkEndTimeEvents
      const challengesToFinalize = allChallenges.filter(challenge => {
        if (challenge.challengeEndTime) return false; // Has configured end time
        const createdAt = new Date(challenge.createdAt);
        return createdAt >= yesterdayStart && createdAt < yesterdayEnd;
      });

      for (const challenge of challengesToFinalize) {
        await this.finalizeChallenge(challenge.id);
      }

      // Clean up processed sets for completed challenges
      this.cleanupProcessedSets();
    } catch (error) {
      console.error('[Scheduler] Finalization error:', error);
    }
  }

  /**
   * Clean up processed sets to prevent memory leaks
   */
  private cleanupProcessedSets() {
    // Keep only recent entries (challenges that might still be processing)
    // In practice, challenges complete within 24-168 hours
    if (this.processedHalftimes.size > 100) {
      this.processedHalftimes.clear();
    }
    if (this.processedEndTimes.size > 100) {
      this.processedEndTimes.clear();
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

