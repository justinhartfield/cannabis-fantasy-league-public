/**
 * Halftime Service
 * 
 * Handles 4:20 PM halftime mechanics for daily challenges:
 * - Score snapshots at halftime
 * - Lineup substitutions (max 2 per team)
 * - Power Hour detection (4:15-4:25 PM for 24h games)
 */

import { getDb } from './db';
import { leagues, teams, dailyTeamScores, halftimeSubstitutions, weeklyLineups, rosters } from '../drizzle/schema';
import { eq, and, sql } from 'drizzle-orm';
import { wsManager } from './websocket';

// Maximum substitutions allowed per team at halftime
const MAX_SUBSTITUTIONS_PER_TEAM = 2;

// Power Hour window (3:30 PM - 5:30 PM CET = 2 hour window centered on 4:20!)
const POWER_HOUR_START_MINUTES = 15 * 60 + 30; // 3:30 PM = 930 minutes
const POWER_HOUR_END_MINUTES = 17 * 60 + 30;   // 5:30 PM = 1050 minutes

export interface HalftimeSnapshot {
  challengeId: number;
  halftimeAt: Date;
  team1Id: number;
  team1Score: number;
  team2Id: number;
  team2Score: number;
}

export interface SubstitutionRequest {
  challengeId: number;
  teamId: number;
  position: string; // e.g., 'mfg1', 'cstr2', 'flex'
  newAssetType: string;
  newAssetId: number;
}

export interface SubstitutionResult {
  success: boolean;
  message: string;
  substitution?: {
    position: string;
    oldAssetType: string;
    oldAssetId: number;
    newAssetType: string;
    newAssetId: number;
  };
}

/**
 * Calculate halftime timestamp for a challenge
 * - For 24h games starting at 8 AM: halftime at 4:20 PM (themed timing!)
 * - For other durations: exact midpoint
 */
export function calculateHalftimeTimestamp(startTime: Date, durationHours: number): Date {
  if (durationHours === 24) {
    // For 24h games, halftime is at 4:20 PM on the start day
    const halftime = new Date(startTime);
    halftime.setHours(16, 20, 0, 0); // 4:20 PM
    
    // If start time is after 4:20 PM, halftime is next day
    if (startTime.getHours() >= 16 && startTime.getMinutes() >= 20) {
      halftime.setDate(halftime.getDate() + 1);
    }
    
    return halftime;
  }
  
  // For other durations, halftime is at the midpoint
  const halfDurationMs = (durationHours * 60 * 60 * 1000) / 2;
  return new Date(startTime.getTime() + halfDurationMs);
}

/**
 * Calculate end time for a challenge
 */
export function calculateEndTime(startTime: Date, durationHours: number): Date {
  const durationMs = durationHours * 60 * 60 * 1000;
  return new Date(startTime.getTime() + durationMs);
}

/**
 * Check if current time is within Power Hour (4:15-4:25 PM)
 * Only applies to 24h challenges
 */
export function isInPowerHour(durationHours: number = 24): boolean {
  if (durationHours !== 24) return false;
  
  const now = new Date();
  const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
  
  return minutesSinceMidnight >= POWER_HOUR_START_MINUTES && 
         minutesSinceMidnight <= POWER_HOUR_END_MINUTES;
}

/**
 * Get Power Hour multiplier (2x during 4:15-4:25 PM for 24h games)
 */
export function getPowerHourMultiplier(durationHours: number = 24): number {
  return isInPowerHour(durationHours) ? 2.0 : 1.0;
}

/**
 * Check if a challenge has passed halftime
 */
export async function hasPassedHalftime(challengeId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [challenge] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, challengeId))
    .limit(1);

  if (!challenge || !challenge.halftimeAt) return false;

  const now = new Date();
  const halftimeAt = new Date(challenge.halftimeAt);
  
  return now >= halftimeAt;
}

/**
 * Take a halftime score snapshot for a challenge
 */
export async function takeHalftimeSnapshot(challengeId: number): Promise<HalftimeSnapshot | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Get challenge
    const [challenge] = await db
      .select()
      .from(leagues)
      .where(and(
        eq(leagues.id, challengeId),
        eq(leagues.leagueType, 'challenge')
      ))
      .limit(1);

    if (!challenge) {
      console.error(`[HalftimeService] Challenge ${challengeId} not found`);
      return null;
    }

    // Already took snapshot
    if (challenge.isHalftimePassed) {
      console.log(`[HalftimeService] Halftime snapshot already taken for ${challengeId}`);
      return null;
    }

    // Get teams
    const challengeTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.leagueId, challengeId))
      .limit(2);

    if (challengeTeams.length < 2) {
      console.error(`[HalftimeService] Not enough teams for challenge ${challengeId}`);
      return null;
    }

    // Get current scores
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
          points: score?.totalPoints || 0
        };
      })
    );

    // Update challenge with halftime scores
    await db
      .update(leagues)
      .set({
        halftimeScoreTeam1: scores[0].points,
        halftimeScoreTeam2: scores[1].points,
        isHalftimePassed: true,
        updatedAt: new Date().toISOString()
      })
      .where(eq(leagues.id, challengeId));

    const halftimeAt = challenge.halftimeAt ? new Date(challenge.halftimeAt) : new Date();

    const snapshot: HalftimeSnapshot = {
      challengeId,
      halftimeAt,
      team1Id: challengeTeams[0].id,
      team1Score: scores[0].points,
      team2Id: challengeTeams[1].id,
      team2Score: scores[1].points
    };

    // Broadcast halftime event via WebSocket
    wsManager.notifyChallenge(challengeId, 'halftime', {
      type: 'halftime_snapshot',
      ...snapshot,
      message: '🌿 HALFTIME! 4:20 - Time for lineup adjustments!'
    });

    console.log(`[HalftimeService] Halftime snapshot for challenge ${challengeId}: Team1=${scores[0].points}, Team2=${scores[1].points}`);

    return snapshot;
  } catch (error) {
    console.error(`[HalftimeService] Error taking halftime snapshot:`, error);
    return null;
  }
}

/**
 * Get remaining substitutions for a team
 */
export async function getRemainingSubstitutions(challengeId: number, teamId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const existingSubs = await db
    .select()
    .from(halftimeSubstitutions)
    .where(and(
      eq(halftimeSubstitutions.challengeId, challengeId),
      eq(halftimeSubstitutions.teamId, teamId)
    ));

  return MAX_SUBSTITUTIONS_PER_TEAM - existingSubs.length;
}

/**
 * Make a halftime substitution
 */
export async function makeSubstitution(request: SubstitutionRequest): Promise<SubstitutionResult> {
  const db = await getDb();
  if (!db) {
    return { success: false, message: 'Database not available' };
  }

  try {
    // Check if challenge exists and is in second half
    const [challenge] = await db
      .select()
      .from(leagues)
      .where(and(
        eq(leagues.id, request.challengeId),
        eq(leagues.leagueType, 'challenge')
      ))
      .limit(1);

    if (!challenge) {
      return { success: false, message: 'Challenge not found' };
    }

    // Must be past halftime but not complete
    if (!challenge.isHalftimePassed) {
      return { success: false, message: 'Halftime has not passed yet. Wait for 4:20 PM!' };
    }

    if (challenge.status === 'complete') {
      return { success: false, message: 'Challenge is already complete' };
    }

    // Check if overtime (no subs in OT)
    if (challenge.isInOvertime) {
      return { success: false, message: 'No substitutions allowed during overtime' };
    }

    // Check remaining substitutions
    const remainingSubs = await getRemainingSubstitutions(request.challengeId, request.teamId);
    if (remainingSubs <= 0) {
      return { success: false, message: `Maximum ${MAX_SUBSTITUTIONS_PER_TEAM} substitutions already used` };
    }

    // Get current lineup to find what's being replaced
    const [lineup] = await db
      .select()
      .from(weeklyLineups)
      .where(eq(weeklyLineups.teamId, request.teamId))
      .limit(1);

    if (!lineup) {
      return { success: false, message: 'No lineup found for this team' };
    }

    // Determine current asset at position
    let oldAssetId: number | null = null;
    let oldAssetType: string | null = null;

    const positionMap: Record<string, { idField: keyof typeof lineup; typeField?: keyof typeof lineup }> = {
      'mfg1': { idField: 'mfg1Id', typeField: undefined },
      'mfg2': { idField: 'mfg2Id', typeField: undefined },
      'cstr1': { idField: 'cstr1Id', typeField: undefined },
      'cstr2': { idField: 'cstr2Id', typeField: undefined },
      'prd1': { idField: 'prd1Id', typeField: undefined },
      'prd2': { idField: 'prd2Id', typeField: undefined },
      'phm1': { idField: 'phm1Id', typeField: undefined },
      'phm2': { idField: 'phm2Id', typeField: undefined },
      'brd1': { idField: 'brd1Id', typeField: undefined },
      'flex': { idField: 'flexId', typeField: 'flexType' }
    };

    const posInfo = positionMap[request.position];
    if (!posInfo) {
      return { success: false, message: `Invalid position: ${request.position}` };
    }

    oldAssetId = lineup[posInfo.idField] as number | null;
    
    // Determine old asset type from position
    if (request.position.startsWith('mfg')) oldAssetType = 'manufacturer';
    else if (request.position.startsWith('cstr')) oldAssetType = 'strain';
    else if (request.position.startsWith('prd')) oldAssetType = 'product';
    else if (request.position.startsWith('phm')) oldAssetType = 'pharmacy';
    else if (request.position.startsWith('brd')) oldAssetType = 'brand';
    else if (request.position === 'flex' && posInfo.typeField) {
      oldAssetType = lineup[posInfo.typeField] as string | null;
    }

    if (!oldAssetId || !oldAssetType) {
      return { success: false, message: 'No asset found at this position' };
    }

    // Verify new asset is on roster
    const [rosterSlot] = await db
      .select()
      .from(rosters)
      .where(and(
        eq(rosters.teamId, request.teamId),
        eq(rosters.assetType, request.newAssetType),
        eq(rosters.assetId, request.newAssetId)
      ))
      .limit(1);

    if (!rosterSlot) {
      return { success: false, message: 'New asset is not on your roster' };
    }

    // Record the substitution
    await db
      .insert(halftimeSubstitutions)
      .values({
        challengeId: request.challengeId,
        teamId: request.teamId,
        position: request.position,
        oldAssetType,
        oldAssetId,
        newAssetType: request.newAssetType,
        newAssetId: request.newAssetId
      })
      .onConflictDoUpdate({
        target: [halftimeSubstitutions.challengeId, halftimeSubstitutions.teamId, halftimeSubstitutions.position],
        set: {
          oldAssetType,
          oldAssetId,
          newAssetType: request.newAssetType,
          newAssetId: request.newAssetId,
          createdAt: new Date().toISOString()
        }
      });

    // Update the lineup
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString()
    };
    updateData[posInfo.idField as string] = request.newAssetId;
    if (request.position === 'flex') {
      updateData['flexType'] = request.newAssetType;
    }

    await db
      .update(weeklyLineups)
      .set(updateData)
      .where(eq(weeklyLineups.teamId, request.teamId));

    // Broadcast substitution event
    wsManager.notifyChallenge(request.challengeId, 'substitution', {
      type: 'halftime_substitution',
      teamId: request.teamId,
      position: request.position,
      oldAssetType,
      oldAssetId,
      newAssetType: request.newAssetType,
      newAssetId: request.newAssetId,
      remainingSubstitutions: remainingSubs - 1
    });

    console.log(`[HalftimeService] Substitution made: Team ${request.teamId} replaced ${oldAssetType}:${oldAssetId} with ${request.newAssetType}:${request.newAssetId} at ${request.position}`);

    return {
      success: true,
      message: `Substitution successful! ${remainingSubs - 1} substitution(s) remaining.`,
      substitution: {
        position: request.position,
        oldAssetType,
        oldAssetId,
        newAssetType: request.newAssetType,
        newAssetId: request.newAssetId
      }
    };
  } catch (error) {
    console.error(`[HalftimeService] Error making substitution:`, error);
    return { success: false, message: 'Failed to make substitution' };
  }
}

/**
 * Get halftime status for a challenge
 */
export async function getHalftimeStatus(challengeId: number) {
  const db = await getDb();
  if (!db) return null;

  const [challenge] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, challengeId))
    .limit(1);

  if (!challenge) return null;

  const now = new Date();
  const halftimeAt = challenge.halftimeAt ? new Date(challenge.halftimeAt) : null;
  const endTime = challenge.challengeEndTime ? new Date(challenge.challengeEndTime) : null;

  let phase: 'first_half' | 'halftime_window' | 'second_half' | 'overtime' | 'complete' = 'first_half';
  
  if (challenge.status === 'complete') {
    phase = 'complete';
  } else if (challenge.isInOvertime) {
    phase = 'overtime';
  } else if (challenge.isHalftimePassed) {
    phase = 'second_half';
  } else if (halftimeAt && now >= halftimeAt) {
    // In halftime window (15 min window for subs)
    const halftimeWindowEnd = new Date(halftimeAt.getTime() + 15 * 60 * 1000);
    phase = now <= halftimeWindowEnd ? 'halftime_window' : 'second_half';
  }

  const isPowerHour = challenge.durationHours === 24 && isInPowerHour(challenge.durationHours || 24);

  return {
    challengeId,
    phase,
    halftimeAt,
    endTime,
    halftimeScoreTeam1: challenge.halftimeScoreTeam1,
    halftimeScoreTeam2: challenge.halftimeScoreTeam2,
    isHalftimePassed: challenge.isHalftimePassed,
    isInOvertime: challenge.isInOvertime,
    isPowerHour,
    powerHourMultiplier: isPowerHour ? 2.0 : 1.0,
    durationHours: challenge.durationHours || 24
  };
}

/**
 * Initialize halftime timing for a new challenge
 */
export async function initializeChallengeTimings(
  challengeId: number, 
  startTime: Date, 
  durationHours: number = 24
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const halftimeAt = calculateHalftimeTimestamp(startTime, durationHours);
  const endTime = calculateEndTime(startTime, durationHours);

  await db
    .update(leagues)
    .set({
      durationHours,
      challengeStartTime: startTime.toISOString(),
      challengeEndTime: endTime.toISOString(),
      halftimeAt: halftimeAt.toISOString(),
      isHalftimePassed: false,
      isInOvertime: false,
      updatedAt: new Date().toISOString()
    })
    .where(eq(leagues.id, challengeId));

  console.log(`[HalftimeService] Initialized challenge ${challengeId}: Start=${startTime.toISOString()}, Halftime=${halftimeAt.toISOString()}, End=${endTime.toISOString()}`);
}

export default {
  calculateHalftimeTimestamp,
  calculateEndTime,
  isInPowerHour,
  getPowerHourMultiplier,
  hasPassedHalftime,
  takeHalftimeSnapshot,
  getRemainingSubstitutions,
  makeSubstitution,
  getHalftimeStatus,
  initializeChallengeTimings,
  MAX_SUBSTITUTIONS_PER_TEAM
};

