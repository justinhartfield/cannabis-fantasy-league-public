import { getDb } from "./db";
import { leagues, teams, draftPicks } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

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
  const teamCount = league.teamCount;

  // Get all teams in draft order
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(teams.draftPosition);

  if (allTeams.length === 0) throw new Error("No teams in league");

  // Calculate team index based on draft type
  let teamIndex: number;
  
  if (league.draftType === "snake") {
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
  assetType: "manufacturer" | "cannabis_strain" | "product" | "pharmacy",
  assetId: number
): Promise<{ valid: boolean; error?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
  const teamRoster = await db.query.rosters.findMany({
    where: (rosters, { eq }) => eq(rosters.teamId, teamId),
  });

  const assetCounts = {
    manufacturer: 0,
    cannabis_strain: 0,
    product: 0,
    pharmacy: 0,
  };

  for (const item of teamRoster) {
    if (item.assetType in assetCounts) {
      assetCounts[item.assetType as keyof typeof assetCounts]++;
    }
  }

  // Check roster limits (2 of each type, total of 9 including 1 flex)
  const limits = {
    manufacturer: 2,
    cannabis_strain: 2,
    product: 2,
    pharmacy: 2,
  };

  if (assetCounts[assetType] >= limits[assetType]) {
    // Check if we can use the FLEX spot
    const totalPicks = Object.values(assetCounts).reduce((a, b) => a + b, 0);
    if (totalPicks >= 9) {
      return { valid: false, error: "Roster is full" };
    }
    // FLEX spot can be used for any position
  }

  return { valid: true };
}

/**
 * Advance to the next pick
 */
export async function advanceDraftPick(leagueId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league) throw new Error("League not found");

  const totalPicks = league.teamCount * 9; // 9 rounds total
  const nextPickNumber = league.currentDraftPick + 1;

  if (nextPickNumber > totalPicks) {
    // Draft is complete
    await db
      .update(leagues)
      .set({
        draftCompleted: 1,
        status: "active",
        currentDraftPick: totalPicks,
        currentDraftRound: 9,
      })
      .where(eq(leagues.id, leagueId));
  } else {
    // Calculate next round
    const nextRound = Math.ceil(nextPickNumber / league.teamCount);

    await db
      .update(leagues)
      .set({
        currentDraftPick: nextPickNumber,
        currentDraftRound: nextRound,
      })
      .where(eq(leagues.id, leagueId));
  }
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
    totalRounds: 9,
    totalPicks: league.teamCount * 9,
    nextTeam: nextPick,
    draftType: league.draftType,
    pickTimeLimit: league.draftPickTimeLimit,
  };
}
