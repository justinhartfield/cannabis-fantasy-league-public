/**
 * Score Broadcaster Service
 * 
 * Manages real-time score updates by:
 * 1. Tracking previous scores per challenge
 * 2. Detecting score deltas when new scores are calculated
 * 3. Generating scoring play events for each asset that changed
 * 4. Drip-feeding plays over time via WebSocket for a sports broadcast feel
 */

import { getDb } from './db';
import { wsManager } from './websocket';
import { dailyTeamScores, dailyScoringBreakdowns, teams } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

type AssetType = 'manufacturer' | 'cannabis_strain' | 'product' | 'pharmacy' | 'brand';

interface ScoringPlayData {
  attackingTeamId: number;
  attackingTeamName: string;
  defendingTeamId: number;
  defendingTeamName: string;
  playerName: string;
  playerType: AssetType;
  pointsScored: number;
  attackerNewTotal: number;
  defenderTotal: number;
  imageUrl?: string | null;
  position?: string;
}

interface AssetScore {
  assetType: AssetType;
  assetId: number;
  assetName: string;
  position: string;
  points: number;
  imageUrl?: string | null;
}

interface TeamScoreSnapshot {
  teamId: number;
  teamName: string;
  totalPoints: number;
  assets: Map<string, AssetScore>; // key: `${assetType}:${assetId}`
}

interface ChallengeSnapshot {
  teams: Map<number, TeamScoreSnapshot>; // teamId -> snapshot
  lastUpdated: Date;
}

class ScoreBroadcaster {
  // Store previous scores: challengeId -> snapshot
  private previousScores: Map<number, ChallengeSnapshot> = new Map();
  
  // Active broadcast timers per challenge
  private broadcastTimers: Map<number, NodeJS.Timeout> = new Map();
  
  // Pending plays queue per challenge
  private pendingPlays: Map<number, ScoringPlayData[]> = new Map();

  /**
   * Detect score changes and queue scoring plays for broadcast
   * Called after scores are calculated for a challenge
   */
  async detectAndQueuePlays(
    challengeId: number,
    statDate: string,
    spreadOverMinutes: number = 10
  ): Promise<number> {
    const db = await getDb();
    if (!db) {
      console.error('[ScoreBroadcaster] Database not available');
      return 0;
    }

    try {
      // Get current scores from database
      const currentSnapshot = await this.fetchCurrentScores(challengeId, statDate);
      if (!currentSnapshot || currentSnapshot.teams.size < 2) {
        console.log(`[ScoreBroadcaster] Challenge ${challengeId} doesn't have enough teams yet`);
        return 0;
      }

      // Get previous snapshot (or create empty one if first run)
      const previousSnapshot = this.previousScores.get(challengeId);

      // Detect changes and generate scoring plays
      const scoringPlays = this.detectScoringPlays(previousSnapshot, currentSnapshot);

      // Update stored snapshot for next comparison
      this.previousScores.set(challengeId, currentSnapshot);

      if (scoringPlays.length === 0) {
        console.log(`[ScoreBroadcaster] No score changes detected for challenge ${challengeId}`);
        return 0;
      }

      console.log(`[ScoreBroadcaster] Detected ${scoringPlays.length} scoring plays for challenge ${challengeId}`);

      // Queue plays for drip-feed broadcast
      this.queuePlaysForBroadcast(challengeId, scoringPlays, spreadOverMinutes);

      return scoringPlays.length;
    } catch (error) {
      console.error(`[ScoreBroadcaster] Error detecting plays for challenge ${challengeId}:`, error);
      return 0;
    }
  }

  /**
   * Fetch current scores and breakdowns from database
   */
  private async fetchCurrentScores(
    challengeId: number,
    statDate: string
  ): Promise<ChallengeSnapshot | null> {
    const db = await getDb();
    if (!db) return null;

    try {
      // Get all team scores for this challenge
      const teamScores = await db
        .select({
          teamId: dailyTeamScores.teamId,
          totalPoints: dailyTeamScores.totalPoints,
          teamName: teams.name,
        })
        .from(dailyTeamScores)
        .innerJoin(teams, eq(teams.id, dailyTeamScores.teamId))
        .where(
          and(
            eq(dailyTeamScores.challengeId, challengeId),
            eq(dailyTeamScores.statDate, statDate)
          )
        );

      if (teamScores.length < 2) {
        return null;
      }

      const snapshot: ChallengeSnapshot = {
        teams: new Map(),
        lastUpdated: new Date(),
      };

      // For each team, get their asset breakdowns
      for (const teamScore of teamScores) {
        const breakdowns = await db
          .select()
          .from(dailyScoringBreakdowns)
          .where(eq(dailyScoringBreakdowns.dailyTeamScoreId, teamScore.teamId));

        // Find the daily team score ID for this team
        const [dailyScore] = await db
          .select()
          .from(dailyTeamScores)
          .where(
            and(
              eq(dailyTeamScores.challengeId, challengeId),
              eq(dailyTeamScores.teamId, teamScore.teamId),
              eq(dailyTeamScores.statDate, statDate)
            )
          );

        let assetBreakdowns: typeof breakdowns = [];
        if (dailyScore) {
          assetBreakdowns = await db
            .select()
            .from(dailyScoringBreakdowns)
            .where(eq(dailyScoringBreakdowns.dailyTeamScoreId, dailyScore.id));
        }

        const assets = new Map<string, AssetScore>();
        for (const breakdown of assetBreakdowns) {
          const key = `${breakdown.assetType}:${breakdown.assetId}`;
          const breakdownData = breakdown.breakdown as any;
          assets.set(key, {
            assetType: breakdown.assetType as AssetType,
            assetId: breakdown.assetId,
            assetName: breakdownData?.assetName || `Asset ${breakdown.assetId}`,
            position: breakdown.position,
            points: breakdown.totalPoints,
            imageUrl: breakdownData?.imageUrl || null,
          });
        }

        snapshot.teams.set(teamScore.teamId, {
          teamId: teamScore.teamId,
          teamName: teamScore.teamName || `Team ${teamScore.teamId}`,
          totalPoints: teamScore.totalPoints || 0,
          assets,
        });
      }

      return snapshot;
    } catch (error) {
      console.error('[ScoreBroadcaster] Error fetching scores:', error);
      return null;
    }
  }

  /**
   * Compare snapshots and generate scoring plays for changes
   */
  private detectScoringPlays(
    previous: ChallengeSnapshot | undefined,
    current: ChallengeSnapshot
  ): ScoringPlayData[] {
    const plays: ScoringPlayData[] = [];
    const teamIds = Array.from(current.teams.keys());

    if (teamIds.length < 2) return plays;

    // Get the two teams
    const team1 = current.teams.get(teamIds[0])!;
    const team2 = current.teams.get(teamIds[1])!;

    // Check each team's assets for changes
    for (const [teamId, teamSnapshot] of current.teams) {
      const opponentId = teamIds.find(id => id !== teamId)!;
      const opponent = current.teams.get(opponentId)!;
      
      const previousTeam = previous?.teams.get(teamId);

      for (const [assetKey, asset] of teamSnapshot.assets) {
        const previousAsset = previousTeam?.assets.get(assetKey);
        const previousPoints = previousAsset?.points || 0;
        const delta = asset.points - previousPoints;

        // Only create plays for meaningful changes (> 0.5 points)
        if (delta > 0.5) {
          plays.push({
            attackingTeamId: teamId,
            attackingTeamName: teamSnapshot.teamName,
            defendingTeamId: opponentId,
            defendingTeamName: opponent.teamName,
            playerName: asset.assetName,
            playerType: asset.assetType,
            pointsScored: Math.round(delta * 10) / 10, // Round to 1 decimal
            attackerNewTotal: teamSnapshot.totalPoints,
            defenderTotal: opponent.totalPoints,
            imageUrl: asset.imageUrl,
            position: asset.position,
          });
        }
      }
    }

    // Sort plays by points scored (most exciting plays last)
    plays.sort((a, b) => a.pointsScored - b.pointsScored);

    return plays;
  }

  /**
   * Queue scoring plays and start drip-feed broadcast
   */
  private queuePlaysForBroadcast(
    challengeId: number,
    plays: ScoringPlayData[],
    spreadOverMinutes: number
  ): void {
    // Clear any existing timer for this challenge
    if (this.broadcastTimers.has(challengeId)) {
      clearInterval(this.broadcastTimers.get(challengeId)!);
      this.broadcastTimers.delete(challengeId);
    }

    if (plays.length === 0) return;

    // Store pending plays
    this.pendingPlays.set(challengeId, [...plays]);

    // Calculate interval between plays
    const totalTimeMs = spreadOverMinutes * 60 * 1000;
    const intervalMs = Math.max(
      15000, // Minimum 15 seconds between plays
      Math.floor(totalTimeMs / plays.length)
    );

    console.log(
      `[ScoreBroadcaster] Broadcasting ${plays.length} plays over ${spreadOverMinutes} min ` +
      `(${Math.round(intervalMs / 1000)}s apart) for challenge ${challengeId}`
    );

    // Send first play immediately
    this.broadcastNextPlay(challengeId);

    // Schedule remaining plays
    if (plays.length > 1) {
      const timer = setInterval(() => {
        const remaining = this.pendingPlays.get(challengeId);
        if (!remaining || remaining.length === 0) {
          clearInterval(timer);
          this.broadcastTimers.delete(challengeId);
          console.log(`[ScoreBroadcaster] Finished broadcasting for challenge ${challengeId}`);
          return;
        }
        this.broadcastNextPlay(challengeId);
      }, intervalMs);

      this.broadcastTimers.set(challengeId, timer);
    }
  }

  /**
   * Broadcast the next play from the queue
   */
  private broadcastNextPlay(challengeId: number): void {
    const pending = this.pendingPlays.get(challengeId);
    if (!pending || pending.length === 0) return;

    const play = pending.shift()!;
    
    console.log(
      `[ScoreBroadcaster] Broadcasting: ${play.playerName} (+${play.pointsScored}) ` +
      `for ${play.attackingTeamName} (${pending.length} remaining)`
    );

    // Send via WebSocket
    wsManager.notifyScoringPlay(challengeId, {
      attackingTeamId: play.attackingTeamId,
      attackingTeamName: play.attackingTeamName,
      defendingTeamId: play.defendingTeamId,
      defendingTeamName: play.defendingTeamName,
      playerName: play.playerName,
      playerType: play.playerType,
      pointsScored: play.pointsScored,
      attackerNewTotal: play.attackerNewTotal,
      defenderTotal: play.defenderTotal,
      imageUrl: play.imageUrl,
      position: play.position,
    });
  }

  /**
   * Clear all state for a challenge (call when challenge ends)
   */
  clearChallenge(challengeId: number): void {
    if (this.broadcastTimers.has(challengeId)) {
      clearInterval(this.broadcastTimers.get(challengeId)!);
      this.broadcastTimers.delete(challengeId);
    }
    this.previousScores.delete(challengeId);
    this.pendingPlays.delete(challengeId);
    console.log(`[ScoreBroadcaster] Cleared state for challenge ${challengeId}`);
  }

  /**
   * Get count of pending plays for a challenge
   */
  getPendingPlayCount(challengeId: number): number {
    return this.pendingPlays.get(challengeId)?.length || 0;
  }
}

export const scoreBroadcaster = new ScoreBroadcaster();

