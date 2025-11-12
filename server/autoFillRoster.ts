import { eq, and, notInArray } from "drizzle-orm";
import { getDb } from "./db";
import { rosters, draftPicks, teams } from "../drizzle/schema";

/**
 * Auto-fill empty roster slots with drafted players
 * This ensures all drafted players are added to the roster
 */
export async function autoFillRoster(teamId: number, leagueId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all draft picks for this team
  const picks = await db
    .select()
    .from(draftPicks)
    .where(
      and(
        eq(draftPicks.teamId, teamId),
        eq(draftPicks.leagueId, leagueId)
      )
    );

  if (picks.length === 0) {
    return { added: 0, message: "No draft picks found" };
  }

  // Get existing roster entries
  const existingRoster = await db
    .select()
    .from(rosters)
    .where(eq(rosters.teamId, teamId));

  // Find picks that aren't in the roster yet
  const existingAssets = new Set(
    existingRoster.map(r => `${r.assetType}:${r.assetId}`)
  );

  const missingPicks = picks.filter(
    pick => !existingAssets.has(`${pick.assetType}:${pick.assetId}`)
  );

  if (missingPicks.length === 0) {
    return { added: 0, message: "Roster already complete" };
  }

  // Add missing picks to roster
  const rosterEntries = missingPicks.map(pick => ({
    teamId,
    assetType: pick.assetType,
    assetId: pick.assetId,
    acquiredWeek: 1, // Draft picks are acquired in week 1
    acquiredVia: "draft" as const,
  }));

  await db.insert(rosters).values(rosterEntries);

  return {
    added: rosterEntries.length,
    message: `Added ${rosterEntries.length} drafted players to roster`,
  };
}

/**
 * Auto-fill rosters for all teams in a league after draft completes
 */
export async function autoFillLeagueRosters(leagueId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all teams in the league
  const leagueTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  const results = await Promise.all(
    leagueTeams.map(team => autoFillRoster(team.id, leagueId))
  );

  const totalAdded = results.reduce((sum, r) => sum + r.added, 0);

  return {
    totalAdded,
    teamResults: results.map((r, i) => ({
      teamId: leagueTeams[i].id,
      teamName: leagueTeams[i].name,
      ...r,
    })),
  };
}
