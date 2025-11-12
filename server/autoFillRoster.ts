import { eq, and, notInArray } from "drizzle-orm";
import { getDb } from "./db";
import { rosters, draftPicks, teams, weeklyLineups } from "../drizzle/schema";

/**
 * Auto-assign drafted players to appropriate lineup slots
 */
async function autoAssignLineupSlots(
  teamId: number,
  leagueId: number,
  picks: any[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get league info for current year/week
  const [league] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!league) return;

  // Group picks by asset type
  const manufacturers = picks.filter(p => p.assetType === 'manufacturer');
  const strains = picks.filter(p => p.assetType === 'cannabisStrain');
  const products = picks.filter(p => p.assetType === 'product');
  const pharmacies = picks.filter(p => p.assetType === 'pharmacy');
  const brands = picks.filter(p => p.assetType === 'brand');

  // Assign to slots (first picks go to main slots, rest to flex/bench)
  const lineupData: any = {
    teamId,
    year: new Date().getFullYear(),
    week: 1, // Start with week 1
  };

  // Assign manufacturers
  if (manufacturers[0]) lineupData.mfg1Id = manufacturers[0].assetId;
  if (manufacturers[1]) lineupData.mfg2Id = manufacturers[1].assetId;

  // Assign strains
  if (strains[0]) lineupData.cstr1Id = strains[0].assetId;
  if (strains[1]) lineupData.cstr2Id = strains[1].assetId;

  // Assign products
  if (products[0]) lineupData.prd1Id = products[0].assetId;
  if (products[1]) lineupData.prd2Id = products[1].assetId;

  // Assign pharmacies
  if (pharmacies[0]) lineupData.phm1Id = pharmacies[0].assetId;
  if (pharmacies[1]) lineupData.phm2Id = pharmacies[1].assetId;

  // Assign brand
  if (brands[0]) lineupData.brd1Id = brands[0].assetId;

  // Assign flex (use first available extra asset)
  const flexCandidates = [
    ...manufacturers.slice(2),
    ...strains.slice(2),
    ...products.slice(2),
    ...pharmacies.slice(2),
    ...brands.slice(1),
  ];

  if (flexCandidates[0]) {
    lineupData.flexId = flexCandidates[0].assetId;
    lineupData.flexType = flexCandidates[0].assetType;
  }

  // Check if lineup already exists for this team/year/week
  const existingLineup = await db
    .select()
    .from(weeklyLineups)
    .where(
      and(
        eq(weeklyLineups.teamId, teamId),
        eq(weeklyLineups.year, lineupData.year),
        eq(weeklyLineups.week, lineupData.week)
      )
    )
    .limit(1);

  if (existingLineup.length === 0) {
    // Create new lineup
    await db.insert(weeklyLineups).values(lineupData);
  } else {
    // Update existing lineup
    await db
      .update(weeklyLineups)
      .set(lineupData)
      .where(eq(weeklyLineups.id, existingLineup[0].id));
  }
}

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

  // Also create weekly lineup with drafted players assigned to slots
  await autoAssignLineupSlots(teamId, leagueId, picks);

  return {
    added: rosterEntries.length,
    message: `Added ${rosterEntries.length} drafted players to roster and assigned to lineup slots`,
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
