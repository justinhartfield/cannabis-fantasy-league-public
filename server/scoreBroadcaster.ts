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
import { dailyTeamScores, dailyScoringBreakdowns, teams, manufacturers, cannabisStrains, pharmacies, brands } from '../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

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
   * Fetch asset names from their respective tables
   */
  private async fetchAssetNames(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    breakdowns: Array<{ assetType: string; assetId: number }>
  ): Promise<Map<string, { name: string; imageUrl?: string | null }>> {
    const result = new Map<string, { name: string; imageUrl?: string | null }>();
    
    // Group by asset type
    const manufacturerIds: number[] = [];
    const strainIds: number[] = [];
    const pharmacyIds: number[] = [];
    const brandIds: number[] = [];

    for (const b of breakdowns) {
      if (b.assetType === 'manufacturer') manufacturerIds.push(b.assetId);
      else if (b.assetType === 'cannabis_strain' || b.assetType === 'product') strainIds.push(b.assetId);
      else if (b.assetType === 'pharmacy') pharmacyIds.push(b.assetId);
      else if (b.assetType === 'brand') brandIds.push(b.assetId);
    }

    try {
      // Fetch manufacturers
      if (manufacturerIds.length > 0) {
        const mfgData = await db
          .select({ id: manufacturers.id, name: manufacturers.name, imageUrl: manufacturers.logoUrl })
          .from(manufacturers)
          .where(inArray(manufacturers.id, manufacturerIds));
        for (const m of mfgData) {
          result.set(`manufacturer:${m.id}`, { name: m.name, imageUrl: m.imageUrl });
        }
      }

      // Fetch strains (for both cannabis_strain and product types)
      if (strainIds.length > 0) {
        const strainData = await db
          .select({ id: cannabisStrains.id, name: cannabisStrains.name, imageUrl: cannabisStrains.imageUrl })
          .from(cannabisStrains)
          .where(inArray(cannabisStrains.id, strainIds));
        for (const s of strainData) {
          result.set(`cannabis_strain:${s.id}`, { name: s.name, imageUrl: s.imageUrl });
          result.set(`product:${s.id}`, { name: s.name, imageUrl: s.imageUrl });
        }
      }

      // Fetch pharmacies
      if (pharmacyIds.length > 0) {
        const pharmData = await db
          .select({ id: pharmacies.id, name: pharmacies.name, imageUrl: pharmacies.logoUrl })
          .from(pharmacies)
          .where(inArray(pharmacies.id, pharmacyIds));
        for (const p of pharmData) {
          result.set(`pharmacy:${p.id}`, { name: p.name, imageUrl: p.imageUrl });
        }
      }

      // Fetch brands
      if (brandIds.length > 0) {
        const brandData = await db
          .select({ id: brands.id, name: brands.name, imageUrl: brands.logoUrl })
          .from(brands)
          .where(inArray(brands.id, brandIds));
        for (const b of brandData) {
          result.set(`brand:${b.id}`, { name: b.name, imageUrl: b.imageUrl });
        }
      }
    } catch (error) {
      console.error('[ScoreBroadcaster] Error fetching asset names:', error);
    }

    return result;
  }

  /**
   * Detect score changes and queue scoring plays for broadcast
   * Called after scores are calculated for a challenge
   */
  async detectAndQueuePlays(
    challengeId: number,
    statDate: string,
    spreadOverMinutes: number = 10
  ): Promise<number> {
    console.log(`[ScoreBroadcaster] detectAndQueuePlays called for challenge ${challengeId}, date ${statDate}`);
    
    try {
      const db = await getDb();
      if (!db) {
        console.error('[ScoreBroadcaster] Database not available');
        return 0;
      }

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
      // Return 0 instead of throwing - don't let broadcaster errors break score calculation
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
      console.log(`[ScoreBroadcaster] Fetching scores for challenge ${challengeId}, date ${statDate}`);
      
      // Get all team scores for this challenge with daily score IDs
      const teamScoresRaw = await db
        .select({
          dailyScoreId: dailyTeamScores.id,
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

      console.log(`[ScoreBroadcaster] Found ${teamScoresRaw.length} team scores`);

      if (teamScoresRaw.length < 2) {
        console.log(`[ScoreBroadcaster] Not enough teams (need 2, got ${teamScoresRaw.length})`);
        return null;
      }

      const snapshot: ChallengeSnapshot = {
        teams: new Map(),
        lastUpdated: new Date(),
      };

      // Collect all breakdowns first, then fetch asset names in bulk
      const allBreakdowns: Map<number, any[]> = new Map(); // teamId -> breakdowns
      const allAssetRefs: Array<{ assetType: string; assetId: number }> = [];

      // For each team, get their asset breakdowns
      for (const teamScore of teamScoresRaw) {
        let assetBreakdowns: any[] = [];
        
        // Only fetch breakdowns if we have a valid daily score ID
        if (teamScore.dailyScoreId) {
          try {
            assetBreakdowns = await db
              .select({
                id: dailyScoringBreakdowns.id,
                assetType: dailyScoringBreakdowns.assetType,
                assetId: dailyScoringBreakdowns.assetId,
                position: dailyScoringBreakdowns.position,
                totalPoints: dailyScoringBreakdowns.totalPoints,
                breakdown: dailyScoringBreakdowns.breakdown,
              })
              .from(dailyScoringBreakdowns)
              .where(eq(dailyScoringBreakdowns.dailyTeamScoreId, teamScore.dailyScoreId));
          } catch (breakdownError) {
            console.error(`[ScoreBroadcaster] Error fetching breakdowns for team ${teamScore.teamId}:`, breakdownError);
            assetBreakdowns = [];
          }
        }
        
        console.log(`[ScoreBroadcaster] Team ${teamScore.teamId} (dailyScoreId: ${teamScore.dailyScoreId}) has ${assetBreakdowns.length} asset breakdowns`);
        
        allBreakdowns.set(teamScore.teamId, assetBreakdowns);
        
        // Collect asset references for bulk name lookup
        for (const b of assetBreakdowns) {
          if (b.assetType && b.assetId) {
            allAssetRefs.push({ assetType: b.assetType, assetId: b.assetId });
          }
        }
      }

      // Fetch all asset names in bulk
      const assetNames = await this.fetchAssetNames(db, allAssetRefs);
      console.log(`[ScoreBroadcaster] Fetched ${assetNames.size} asset names`);

      // Build team snapshots with real asset names
      for (const teamScore of teamScoresRaw) {
        const assetBreakdowns = allBreakdowns.get(teamScore.teamId) || [];
        const assets = new Map<string, AssetScore>();
        
        for (const breakdown of assetBreakdowns) {
          if (!breakdown.assetType || !breakdown.assetId) continue;
          
          const key = `${breakdown.assetType}:${breakdown.assetId}`;
          const assetInfo = assetNames.get(key);
          
          assets.set(key, {
            assetType: breakdown.assetType as AssetType,
            assetId: breakdown.assetId,
            assetName: assetInfo?.name || `Asset ${breakdown.assetId}`,
            position: breakdown.position || 'unknown',
            points: breakdown.totalPoints || 0,
            imageUrl: assetInfo?.imageUrl || null,
          });
        }

        snapshot.teams.set(teamScore.teamId, {
          teamId: teamScore.teamId,
          teamName: teamScore.teamName || `Team ${teamScore.teamId}`,
          totalPoints: teamScore.totalPoints || 0,
          assets,
        });
      }

      console.log(`[ScoreBroadcaster] Snapshot created with ${snapshot.teams.size} teams`);
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

    const isFirstRun = !previous;
    console.log(`[ScoreBroadcaster] Detecting plays (first run: ${isFirstRun}, current teams: ${teamIds.join(', ')})`);

    // On first run, we need to establish a baseline for future delta calculations
    // However, if scores already exist (user returning to game), we should still
    // send a score update notification (not individual plays, but a refresh trigger)
    if (isFirstRun) {
      console.log(`[ScoreBroadcaster] First run - storing baseline snapshot`);
      // Don't generate individual scoring plays on first run (would show total as delta)
      // but the scores will display from the server query
      return plays;
    }
    
    // Verify previous snapshot has matching team IDs (detect corrupted state)
    const previousTeamIds = Array.from(previous.teams.keys());
    const teamsMatch = teamIds.every(id => previousTeamIds.includes(id));
    if (!teamsMatch) {
      console.warn(`[ScoreBroadcaster] Team mismatch - previous: ${previousTeamIds.join(', ')}, current: ${teamIds.join(', ')}. Treating as first run.`);
      return plays;
    }

    // Check each team's assets for changes since last snapshot
    for (const [teamId, teamSnapshot] of current.teams) {
      const opponentId = teamIds.find(id => id !== teamId)!;
      const opponent = current.teams.get(opponentId)!;
      
      const previousTeam = previous?.teams.get(teamId);
      
      console.log(`[ScoreBroadcaster] Team ${teamId} (${teamSnapshot.teamName}) has ${teamSnapshot.assets.size} assets`);

      for (const [assetKey, asset] of teamSnapshot.assets) {
        const previousAsset = previousTeam?.assets.get(assetKey);
        const previousPoints = previousAsset?.points || 0;
        let delta = asset.points - previousPoints;

        // Sanity check: delta should never exceed the asset's total points
        // This catches edge cases where previous state was corrupted
        if (delta > asset.points) {
          console.warn(`[ScoreBroadcaster] Capping delta for ${asset.assetName}: calculated ${delta}, max ${asset.points}`);
          delta = asset.points;
        }

        // Only broadcast real changes (deltas > 0.5 points)
        if (delta > 0.5) {
          console.log(`[ScoreBroadcaster] Play: ${asset.assetName} +${delta.toFixed(1)} (was ${previousPoints}, now ${asset.points})`);
          plays.push({
            attackingTeamId: teamId,
            attackingTeamName: teamSnapshot.teamName,
            defendingTeamId: opponentId,
            defendingTeamName: opponent.teamName,
            playerName: asset.assetName,
            playerType: asset.assetType,
            pointsScored: Math.round(delta * 10) / 10, // Round to 1 decimal - this is the CHANGE
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
    
    console.log(`[ScoreBroadcaster] Generated ${plays.length} scoring plays`);

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

