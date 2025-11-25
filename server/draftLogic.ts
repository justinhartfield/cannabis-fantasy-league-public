import { getDb } from "./db";
import { leagues, teams, draftPicks, rosters } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { autoFillLeagueRosters } from "./autoFillRoster";
import { autoPopulateLeagueLineups } from "./lineupAutoPopulate";
import { generateSeasonMatchupsForLeague } from "./matchupService";

const DRAFT_TIMING_ENABLED = process.env.DRAFT_TIMING_LOGS === "1";
type LeagueRow = typeof leagues.$inferSelect;

function logDraftTiming(step: string, data?: Record<string, unknown>) {
  if (!DRAFT_TIMING_ENABLED) return;
  if (data) {
    console.log(`[DraftTiming] ${step}`, data);
  } else {
    console.log(`[DraftTiming] ${step}`);
  }
}

/**
 * Calculate which team should pick next in a snake draft
 */
export async function calculateNextPick(leagueId: number): Promise<{
  teamId: number;
  pickNumber: number;
  round: number;
  teamName: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get league info
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league) throw new Error("League not found");

  const currentPick = league.currentDraftPick;
  const currentRound = league.currentDraftRound;

  // Get all teams in draft order
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(teams.draftPosition);

  if (allTeams.length === 0) throw new Error("No teams in league");
  
  // Use actual number of teams, not the configured teamCount
  const teamCount = allTeams.length;

  // Calculate team index based on draft type
  let teamIndex: number;
  
  const isSnakeDraft = league.draftType === "snake" && teamCount > 2;

  if (isSnakeDraft) {
    // Snake draft: odd rounds go forward, even rounds go backward
    if (currentRound % 2 === 1) {
      // Odd round: 1, 2, 3, 4...
      teamIndex = ((currentPick - 1) % teamCount);
    } else {
      // Even round: 4, 3, 2, 1...
      teamIndex = teamCount - 1 - ((currentPick - 1) % teamCount);
    }
  } else {
    // Linear draft: always goes forward
    teamIndex = ((currentPick - 1) % teamCount);
  }

  const team = allTeams[teamIndex];
  if (!team) throw new Error("Team not found for calculated index");

  return {
    teamId: team.id,
    pickNumber: currentPick,
    round: currentRound,
    teamName: team.name,
  };
}

/**
 * Check if it's a specific team's turn to draft
 */
export async function isTeamsTurn(leagueId: number, teamId: number): Promise<boolean> {
  const nextPick = await calculateNextPick(leagueId);
  return nextPick.teamId === teamId;
}

/**
 * Validate if a draft pick is allowed
 */
export async function validateDraftPick(
  leagueId: number,
  teamId: number,
  assetType: "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand",
  assetId: number
): Promise<{ valid: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // First check if draft has started
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league) {
    return { valid: false, error: "League not found" };
  }

  if (!league.draftStarted || league.draftStarted === 0) {
    return { valid: false, error: "Draft has not started yet" };
  }

  if (league.draftCompleted === 1) {
    return { valid: false, error: "Draft is already complete" };
  }

  // Check if it's the team's turn
  const isTurn = await isTeamsTurn(leagueId, teamId);
  if (!isTurn) {
    return { valid: false, error: "It's not your turn to pick" };
  }

  // Check if asset has already been drafted in this league
  const existingPick = await db
    .select()
    .from(draftPicks)
    .where(
      and(
        eq(draftPicks.leagueId, leagueId),
        eq(draftPicks.assetType, assetType),
        eq(draftPicks.assetId, assetId)
      )
    )
    .limit(1);

  if (existingPick.length > 0) {
    return { valid: false, error: "This player has already been drafted" };
  }

  // Check if team has room for this asset type
  const teamRoster = await db
    .select()
    .from(rosters)
    .where(eq(rosters.teamId, teamId));

  const assetCounts = {
    manufacturer: 0,
    cannabis_strain: 0,
    product: 0,
    pharmacy: 0,
    brand: 0,
  };

  for (const item of teamRoster) {
    if (item.assetType in assetCounts) {
      assetCounts[item.assetType as keyof typeof assetCounts]++;
    }
  }

  // Check roster limits - hard cap of 2 per position type to prevent accidental over-drafting
  // Even with flex, a user cannot have more than 2 of any position type
  const hardLimits = {
    manufacturer: 2,
    cannabis_strain: 2,
    product: 2,
    pharmacy: 2,
    brand: 2, // Allow up to 2 brands (1 dedicated slot + 1 flex)
  };

  // Check if picking this asset would exceed the hard limit for this position type
  if (assetCounts[assetType] >= hardLimits[assetType]) {
    return { 
      valid: false, 
      error: `Du hast bereits ${hardLimits[assetType]} ${assetType === 'cannabis_strain' ? 'Strains' : assetType === 'manufacturer' ? 'Hersteller' : assetType === 'pharmacy' ? 'Apotheken' : assetType === 'product' ? 'Produkte' : 'Brands'}. Maximum erreicht!` 
    };
  }

  // Check if roster is full (10 total picks)
  const totalPicks = Object.values(assetCounts).reduce((a, b) => a + b, 0);
  if (totalPicks >= 10) {
    return { valid: false, error: "Roster is full" };
  }

  return { valid: true };
}

/**
 * Advance to the next pick
 */
export async function advanceDraftPick(leagueId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const timingStart = Date.now();

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league) throw new Error("League not found");

  // Get actual team count from database
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  const teamCount = allTeams.length;
  const totalPicks = teamCount * 10; // 10 rounds total (10 roster slots)
  const nextPickNumber = league.currentDraftPick + 1;

  let draftCompleted = false;

  if (nextPickNumber > totalPicks) {
    // Draft is complete
    await db
      .update(leagues)
      .set({
        draftCompleted: 1,
        status: "active",
        currentDraftPick: totalPicks,
        currentDraftRound: 10,
      })
      .where(eq(leagues.id, leagueId));

    // Auto-fill rosters with all drafted players
    try {
      await autoFillLeagueRosters(leagueId);
      console.log(`[advanceDraftPick] Auto-filled rosters for league ${leagueId}`);
    } catch (error) {
      console.error("[advanceDraftPick] Error auto-filling rosters:", error);
    }

    // Auto-populate starting lineups with first 10 picks
    try {
      const populateResult = await autoPopulateLeagueLineups(
        leagueId,
        league.seasonYear,
        league.currentWeek
      );
      console.log(
        `[advanceDraftPick] Auto-populated lineups: ${populateResult.lineupsCreated} created, ` +
        `${populateResult.lineupsSkipped} skipped`
      );

      draftCompleted = true;
    } catch (error) {
      console.error("[advanceDraftPick] Error auto-populating lineups:", error);
    }

    await autoGenerateSeasonScheduleIfNeeded(league, "advanceDraftPick");
  } else {
    // Calculate next round
    const nextRound = Math.ceil(nextPickNumber / teamCount);

    await db
      .update(leagues)
      .set({
        currentDraftPick: nextPickNumber,
        currentDraftRound: nextRound,
      })
      .where(eq(leagues.id, leagueId));
  }

  logDraftTiming("advanceDraftPick", {
    leagueId,
    totalPicks,
    nextPickNumber,
    draftCompleted,
    durationMs: Date.now() - timingStart,
  });

  return draftCompleted;
}

/**
 * Check if draft should be complete and mark it if so
 * This can be called independently to fix stuck drafts
 */
export async function checkAndCompleteDraft(leagueId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league || league.draftCompleted === 1) {
    return false; // Already complete or doesn't exist
  }

  // Get actual team count
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  const teamCount = allTeams.length;
  const totalExpectedPicks = teamCount * 10;

  // Check if all teams have 10 players
  let allTeamsComplete = true;
  for (const team of allTeams) {
    const teamRoster = await db
      .select()
      .from(rosters)
      .where(eq(rosters.teamId, team.id));
    
    if (teamRoster.length < 10) {
      allTeamsComplete = false;
      break;
    }
  }

  // If all teams have 10 players OR we've exceeded the expected picks, mark as complete
  if (allTeamsComplete || league.currentDraftPick >= totalExpectedPicks) {
    await db
      .update(leagues)
      .set({
        draftCompleted: 1,
        status: "active",
      })
      .where(eq(leagues.id, leagueId));

    // Auto-fill rosters with all drafted players
    try {
      await autoFillLeagueRosters(leagueId);
      console.log(`[checkAndCompleteDraft] Auto-filled rosters for league ${leagueId}`);
    } catch (error) {
      console.error("[checkAndCompleteDraft] Error auto-filling rosters:", error);
    }

    // Auto-populate starting lineups with first 10 picks
    try {
      const populateResult = await autoPopulateLeagueLineups(
        leagueId,
        league.seasonYear,
        league.currentWeek
      );
      console.log(
        `[checkAndCompleteDraft] Auto-populated lineups: ${populateResult.lineupsCreated} created, ` +
        `${populateResult.lineupsSkipped} skipped`
      );
    } catch (error) {
      console.error("[checkAndCompleteDraft] Error auto-populating lineups:", error);
    }

    await autoGenerateSeasonScheduleIfNeeded(league, "checkAndCompleteDraft");

    return true;
  }

  return false;
}

/**
 * Start the draft for a league
 */
export async function startDraft(leagueId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(leagues)
    .set({
      draftStarted: 1,
      currentDraftPick: 1,
      currentDraftRound: 1,
    })
    .where(eq(leagues.id, leagueId));
}

/**
 * Get draft status for a league
 */
export async function getDraftStatus(leagueId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league) throw new Error("League not found");

  const nextPick = await calculateNextPick(leagueId);

  return {
    draftStarted: league.draftStarted === 1,
    draftCompleted: league.draftCompleted === 1,
    currentPick: league.currentDraftPick,
    currentRound: league.currentDraftRound,
    totalRounds: 10,
    totalPicks: league.teamCount * 10,
    nextTeam: nextPick,
    draftType: league.draftType,
    pickTimeLimit: league.draftPickTimeLimit,
  };
}

async function autoGenerateSeasonScheduleIfNeeded(
  league: LeagueRow | undefined,
  context: string
) {
  if (!league) return;
  if (league.leagueType !== "season") return;

  const playoffStartWeek = league.playoffStartWeek ?? 19;
  const regularSeasonEndWeek = Math.max(1, playoffStartWeek - 1);

  try {
    const result = await generateSeasonMatchupsForLeague({
      leagueId: league.id,
      year: league.seasonYear,
      startWeek: 1,
      endWeek: regularSeasonEndWeek,
      league,
    });
    console.log(
      `[${context}] Auto-generated ${result.totalMatchups} matchups for league ${league.id}`
    );
  } catch (error) {
    console.error(
      `[${context}] Error auto-generating season matchups for league ${league?.id}:`,
      error
    );
  }
}
