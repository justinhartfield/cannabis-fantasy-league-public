/**
 * Overtime Service - Golden Goal Mechanics
 * 
 * Implements sudden death overtime for close games:
 * - Triggers when final scores are within 50 points
 * - 1-hour overtime period
 * - First team to gain 25-point lead wins immediately
 * - If still tied after 1 hour, highest single-asset score wins
 */

import { getDb } from './db';
import { leagues, teams, dailyTeamScores, dailyScoringBreakdowns } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { wsManager } from './websocket';

// Overtime configuration
const OVERTIME_TRIGGER_THRESHOLD = 50;  // Points difference to trigger OT
const OVERTIME_WIN_MARGIN = 25;         // Points lead needed to win in OT
const OVERTIME_DURATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

export interface OvertimeStatus {
  isInOvertime: boolean;
  overtimeStartTime?: Date;
  overtimeEndTime?: Date;
  team1Id: number;
  team1Score: number;
  team2Id: number;
  team2Score: number;
  currentLead: number;
  leadingTeamId?: number;
  minutesRemaining?: number;
  canWinNow: boolean;
  goldenGoalProgress: number; // 0-100% towards 25-point lead
}

export interface OvertimeResult {
  winnerId: number;
  winnerTeamName: string;
  loserTeamName: string;
  finalScore: number;
  loserScore: number;
  winCondition: 'golden_goal' | 'timeout_lead' | 'timeout_tiebreaker';
  winDescription: string;
}

/**
 * Check if overtime should be triggered for a challenge
 */
export async function shouldTriggerOvertime(challengeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const [challenge] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, challengeId))
      .limit(1);

    if (!challenge || challenge.leagueType !== 'challenge') return false;
    if (challenge.isInOvertime) return false; // Already in OT
    if (challenge.status === 'complete') return false;

    // Check if we're at or past end time
    if (!challenge.challengeEndTime) return false;
    
    const now = new Date();
    const endTime = new Date(challenge.challengeEndTime);
    if (now < endTime) return false; // Not at end time yet

    // Get current scores
    const challengeTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, challengeId))
      .limit(2);

    if (challengeTeams.length < 2) return false;

    const statDate = challenge.challengeStartTime 
      ? new Date(challenge.challengeStartTime).toISOString().split('T')[0]
      : new Date(challenge.createdAt).toISOString().split('T')[0];

    const scores = await Promise.all(
      challengeTeams.map(async (team) => {
        const [score] = await db
          .select()
          .from(dailyTeamScores)
          .where(and(
            eq(dailyTeamScores.teamId, team.id),
            eq(dailyTeamScores.challengeId, challengeId),
            eq(dailyTeamScores.statDate, statDate)
          ))
          .limit(1);

        return score?.totalPoints || 0;
      })
    );

    const scoreDifference = Math.abs(scores[0] - scores[1]);
    return scoreDifference <= OVERTIME_TRIGGER_THRESHOLD;
  } catch (error) {
    console.error(`[OvertimeService] Error checking OT trigger:`, error);
    return false;
  }
}

/**
 * Start overtime for a challenge
 */
export async function startOvertime(challengeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const now = new Date();
    const overtimeEndTime = new Date(now.getTime() + OVERTIME_DURATION_MS);

    await db
      .update(leagues)
      .set({
        isInOvertime: true,
        overtimeEndTime: overtimeEndTime.toISOString(),
        updatedAt: now.toISOString()
      })
      .where(eq(leagues.id, challengeId));

    // Broadcast overtime start
    wsManager.notifyChallenge(challengeId, 'overtime_start', {
      type: 'overtime_start',
      challengeId,
      overtimeStartTime: now.toISOString(),
      overtimeEndTime: overtimeEndTime.toISOString(),
      winMarginRequired: OVERTIME_WIN_MARGIN,
      message: '⚡ GOLDEN GOAL OVERTIME! First to gain 25-point lead wins!'
    });

    console.log(`[OvertimeService] Started overtime for challenge ${challengeId}, ends at ${overtimeEndTime.toISOString()}`);
    return true;
  } catch (error) {
    console.error(`[OvertimeService] Error starting overtime:`, error);
    return false;
  }
}

/**
 * Check overtime status and detect Golden Goal win
 */
export async function checkOvertimeStatus(challengeId: number): Promise<OvertimeStatus | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const [challenge] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, challengeId))
      .limit(1);

    if (!challenge || !challenge.isInOvertime) return null;

    const challengeTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, challengeId))
      .limit(2);

    if (challengeTeams.length < 2) return null;

    const statDate = challenge.challengeStartTime 
      ? new Date(challenge.challengeStartTime).toISOString().split('T')[0]
      : new Date(challenge.createdAt).toISOString().split('T')[0];

    const scores = await Promise.all(
      challengeTeams.map(async (team) => {
        const [score] = await db
          .select()
          .from(dailyTeamScores)
          .where(and(
            eq(dailyTeamScores.teamId, team.id),
            eq(dailyTeamScores.challengeId, challengeId),
            eq(dailyTeamScores.statDate, statDate)
          ))
          .limit(1);

        return {
          teamId: team.id,
          teamName: team.name,
          points: score?.totalPoints || 0
        };
      })
    );

    const team1Score = scores[0].points;
    const team2Score = scores[1].points;
    const currentLead = Math.abs(team1Score - team2Score);
    const leadingTeamId = team1Score > team2Score ? scores[0].teamId : 
                          team2Score > team1Score ? scores[1].teamId : undefined;

    const now = new Date();
    const overtimeEndTime = challenge.overtimeEndTime ? new Date(challenge.overtimeEndTime) : null;
    const minutesRemaining = overtimeEndTime 
      ? Math.max(0, Math.ceil((overtimeEndTime.getTime() - now.getTime()) / 60000))
      : 0;

    const canWinNow = currentLead >= OVERTIME_WIN_MARGIN;
    const goldenGoalProgress = Math.min(100, (currentLead / OVERTIME_WIN_MARGIN) * 100);

    return {
      isInOvertime: true,
      overtimeStartTime: challenge.challengeEndTime ? new Date(challenge.challengeEndTime) : undefined,
      overtimeEndTime: overtimeEndTime || undefined,
      team1Id: scores[0].teamId,
      team1Score,
      team2Id: scores[1].teamId,
      team2Score,
      currentLead,
      leadingTeamId,
      minutesRemaining,
      canWinNow,
      goldenGoalProgress
    };
  } catch (error) {
    console.error(`[OvertimeService] Error checking OT status:`, error);
    return null;
  }
}

/**
 * Check for Golden Goal win condition (25-point lead)
 */
export async function checkGoldenGoalWin(challengeId: number): Promise<OvertimeResult | null> {
  const status = await checkOvertimeStatus(challengeId);
  if (!status || !status.canWinNow || !status.leadingTeamId) return null;

  const db = await getDb();
  if (!db) return null;

  try {
    // Get team names
    const challengeTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, challengeId))
      .limit(2);

    const winner = challengeTeams.find(t => t.id === status.leadingTeamId);
    const loser = challengeTeams.find(t => t.id !== status.leadingTeamId);

    if (!winner || !loser) return null;

    const winnerScore = status.team1Id === winner.id ? status.team1Score : status.team2Score;
    const loserScore = status.team1Id === loser.id ? status.team1Score : status.team2Score;

    // Mark challenge as complete
    await db
      .update(leagues)
      .set({
        status: 'complete',
        overtimeWinnerId: winner.id,
        updatedAt: new Date().toISOString()
      })
      .where(eq(leagues.id, challengeId));

    const result: OvertimeResult = {
      winnerId: winner.id,
      winnerTeamName: winner.name,
      loserTeamName: loser.name,
      finalScore: winnerScore,
      loserScore: loserScore,
      winCondition: 'golden_goal',
      winDescription: `⚡ GOLDEN GOAL! ${winner.name} wins with a ${status.currentLead}-point lead!`
    };

    // Broadcast Golden Goal win
    wsManager.notifyChallenge(challengeId, 'golden_goal', {
      type: 'golden_goal_win',
      ...result
    });

    console.log(`[OvertimeService] Golden Goal win: ${winner.name} beats ${loser.name} by ${status.currentLead} points`);
    return result;
  } catch (error) {
    console.error(`[OvertimeService] Error processing Golden Goal win:`, error);
    return null;
  }
}

/**
 * Handle overtime timeout - determine winner by lead or tiebreaker
 */
export async function handleOvertimeTimeout(challengeId: number): Promise<OvertimeResult | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const [challenge] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, challengeId))
      .limit(1);

    if (!challenge || !challenge.isInOvertime) return null;

    // Check if OT has actually expired
    if (challenge.overtimeEndTime) {
      const now = new Date();
      const endTime = new Date(challenge.overtimeEndTime);
      if (now < endTime) return null; // OT not over yet
    }

    const challengeTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, challengeId))
      .limit(2);

    if (challengeTeams.length < 2) return null;

    const statDate = challenge.challengeStartTime 
      ? new Date(challenge.challengeStartTime).toISOString().split('T')[0]
      : new Date(challenge.createdAt).toISOString().split('T')[0];

    // Get final scores
    const scores = await Promise.all(
      challengeTeams.map(async (team) => {
        const [score] = await db
          .select()
          .from(dailyTeamScores)
          .where(and(
            eq(dailyTeamScores.teamId, team.id),
            eq(dailyTeamScores.challengeId, challengeId),
            eq(dailyTeamScores.statDate, statDate)
          ))
          .limit(1);

        return {
          teamId: team.id,
          teamName: team.name,
          points: score?.totalPoints || 0,
          scoreId: score?.id
        };
      })
    );

    let winner: typeof scores[0];
    let loser: typeof scores[0];
    let winCondition: 'timeout_lead' | 'timeout_tiebreaker';
    let winDescription: string;

    if (scores[0].points !== scores[1].points) {
      // Someone has the lead
      winner = scores[0].points > scores[1].points ? scores[0] : scores[1];
      loser = scores[0].points > scores[1].points ? scores[1] : scores[0];
      winCondition = 'timeout_lead';
      winDescription = `⏱️ Time's up! ${winner.teamName} wins with ${winner.points - loser.points}-point lead!`;
    } else {
      // True tie - use highest single-asset score as tiebreaker
      const tiebreaker = await resolveTiebreaker(challengeId, scores, statDate);
      if (!tiebreaker) {
        // Ultimate fallback: first team wins (shouldn't happen)
        winner = scores[0];
        loser = scores[1];
      } else {
        winner = tiebreaker.winner;
        loser = tiebreaker.loser;
      }
      winCondition = 'timeout_tiebreaker';
      winDescription = `🎯 Tiebreaker! ${winner.teamName} wins with highest single-asset score!`;
    }

    // Mark challenge as complete
    await db
      .update(leagues)
      .set({
        status: 'complete',
        overtimeWinnerId: winner.teamId,
        updatedAt: new Date().toISOString()
      })
      .where(eq(leagues.id, challengeId));

    const result: OvertimeResult = {
      winnerId: winner.teamId,
      winnerTeamName: winner.teamName,
      loserTeamName: loser.teamName,
      finalScore: winner.points,
      loserScore: loser.points,
      winCondition,
      winDescription
    };

    // Broadcast overtime end
    wsManager.notifyChallenge(challengeId, 'overtime_end', {
      type: 'overtime_timeout',
      ...result
    });

    console.log(`[OvertimeService] OT timeout: ${winner.teamName} wins (${winCondition})`);
    return result;
  } catch (error) {
    console.error(`[OvertimeService] Error handling OT timeout:`, error);
    return null;
  }
}

/**
 * Resolve a true tie using highest single-asset score
 */
async function resolveTiebreaker(
  challengeId: number,
  scores: Array<{ teamId: number; teamName: string; points: number; scoreId?: number }>,
  statDate: string
): Promise<{ winner: typeof scores[0]; loser: typeof scores[0] } | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get highest single-asset score for each team
    const highestScores = await Promise.all(
      scores.map(async (teamScore) => {
        if (!teamScore.scoreId) return { ...teamScore, highestAssetScore: 0 };

        const breakdowns = await db
          .select()
          .from(dailyScoringBreakdowns)
          .where(eq(dailyScoringBreakdowns.dailyTeamScoreId, teamScore.scoreId))
          .orderBy(desc(dailyScoringBreakdowns.totalPoints))
          .limit(1);

        return {
          ...teamScore,
          highestAssetScore: breakdowns[0]?.totalPoints || 0
        };
      })
    );

    if (highestScores[0].highestAssetScore === highestScores[1].highestAssetScore) {
      // Still tied - return first team (edge case)
      return { winner: scores[0], loser: scores[1] };
    }

    const winner = highestScores[0].highestAssetScore > highestScores[1].highestAssetScore
      ? scores[0] : scores[1];
    const loser = winner === scores[0] ? scores[1] : scores[0];

    return { winner, loser };
  } catch (error) {
    console.error(`[OvertimeService] Error resolving tiebreaker:`, error);
    return null;
  }
}

/**
 * Get overtime configuration
 */
export function getOvertimeConfig() {
  return {
    triggerThreshold: OVERTIME_TRIGGER_THRESHOLD,
    winMargin: OVERTIME_WIN_MARGIN,
    durationMs: OVERTIME_DURATION_MS,
    durationMinutes: OVERTIME_DURATION_MS / 60000
  };
}

export default {
  shouldTriggerOvertime,
  startOvertime,
  checkOvertimeStatus,
  checkGoldenGoalWin,
  handleOvertimeTimeout,
  getOvertimeConfig,
  OVERTIME_TRIGGER_THRESHOLD,
  OVERTIME_WIN_MARGIN,
  OVERTIME_DURATION_MS
};

