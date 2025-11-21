import { getDb } from "./db";
import { manufacturers, cannabisStrains, strains, pharmacies, brands, rosters, teams, draftPicks, leagues } from "../drizzle/schema";
import { eq, and, notInArray, inArray, sql, desc } from "drizzle-orm";
import { advanceDraftPick, calculateNextPick } from "./draftLogic";
import { wsManager } from "./websocket";

/**
 * Auto-Pick System
 * 
 * Automatically selects the best available player when timer expires
 * Uses a simple "best available" strategy based on position needs
 */

export async function makeAutoPick(leagueId: number, teamId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get team's current roster
  const teamRoster = await db
    .select()
    .from(rosters)
    .where(eq(rosters.teamId, teamId));

  // Count positions
  const positionCounts = {
    manufacturer: 0,
    cannabis_strain: 0,
    product: 0,
    pharmacy: 0,
    brand: 0,
  };

  for (const item of teamRoster) {
    if (item.assetType in positionCounts) {
      positionCounts[item.assetType as keyof typeof positionCounts]++;
    }
  }

  // Determine which position to draft
  let targetPosition: keyof typeof positionCounts = "manufacturer";
  let minCount = positionCounts.manufacturer;

  for (const [position, count] of Object.entries(positionCounts)) {
    if (count < minCount) {
      targetPosition = position as keyof typeof positionCounts;
      minCount = count;
    }
  }

  // Get all teams in league for filtering drafted players
  const leagueTeams = await db
    .select({ teamId: teams.id })
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  const teamIds = leagueTeams.map((t) => t.teamId);

  // Get already drafted players of this type
  const draftedAssets = teamIds.length > 0
    ? await db
        .select({ assetId: rosters.assetId })
        .from(rosters)
        .where(
          and(
            inArray(rosters.teamId, teamIds),
            eq(rosters.assetType, targetPosition)
          )
        )
    : [];

  const draftedIds = draftedAssets.map((r) => r.assetId);

  // Get best available player
  let pickedAsset: { id: number; name: string } | null = null;

  if (targetPosition === "manufacturer") {
    const available = await db
      .select()
      .from(manufacturers)
      .where(draftedIds.length > 0 ? notInArray(manufacturers.id, draftedIds) : undefined)
      .orderBy(desc(manufacturers.productCount))
      .limit(1);

    if (available.length > 0) {
      pickedAsset = { id: available[0].id, name: available[0].name };
    }
  } else if (targetPosition === "cannabis_strain") {
    const available = await db
      .select()
      .from(cannabisStrains)
      .where(draftedIds.length > 0 ? notInArray(cannabisStrains.id, draftedIds) : undefined)
      .orderBy(desc(cannabisStrains.pharmaceuticalProductCount))
      .limit(1);

    if (available.length > 0) {
      pickedAsset = { id: available[0].id, name: available[0].name };
    }
  } else if (targetPosition === "product") {
    const available = await db
      .select()
      .from(strains)
      .where(draftedIds.length > 0 ? notInArray(strains.id, draftedIds) : undefined)
      .orderBy(desc(strains.pharmacyCount), desc(strains.favoriteCount))
      .limit(1);

    if (available.length > 0) {
      pickedAsset = { id: available[0].id, name: available[0].name };
    }
  } else if (targetPosition === "pharmacy") {
    const available = await db
      .select()
      .from(pharmacies)
      .where(draftedIds.length > 0 ? notInArray(pharmacies.id, draftedIds) : undefined)
      .orderBy(desc(pharmacies.productCount), desc(pharmacies.weeklyRevenueCents))
      .limit(1);

    if (available.length > 0) {
      pickedAsset = { id: available[0].id, name: available[0].name };
    }
  } else if (targetPosition === "brand") {
    const available = await db
      .select()
      .from(brands)
      .where(draftedIds.length > 0 ? notInArray(brands.id, draftedIds) : undefined)
      .orderBy(desc(brands.totalFavorites), desc(brands.affiliateClicks))
      .limit(1);

    if (available.length > 0) {
      pickedAsset = { id: available[0].id, name: available[0].name };
    }
  }

  if (!pickedAsset) {
    throw new Error("No available players to auto-pick");
  }

  // Get team details
  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  // Add to roster
  await db.insert(rosters).values({
    teamId,
    assetType: targetPosition,
    assetId: pickedAsset.id,
    acquiredWeek: 0,
    acquiredVia: "draft",
  });

  // Record draft pick
  const draftStatus = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (draftStatus.length > 0) {
    await db.insert(draftPicks).values({
      leagueId,
      teamId,
      round: draftStatus[0].currentDraftRound,
      pickNumber: draftStatus[0].currentDraftPick,
      assetType: targetPosition,
      assetId: pickedAsset.id,
    });
  }

  // Notify all clients
  wsManager.notifyPlayerPicked(leagueId, {
    teamId,
    teamName: team?.name || "Unknown Team",
    assetType: targetPosition,
    assetId: pickedAsset.id,
    assetName: pickedAsset.name,
    pickNumber: draftStatus[0]?.currentDraftPick || 0,
  });

  // Advance to next pick
  const draftCompletedNow = await advanceDraftPick(leagueId);

  // Calculate and notify next pick if draft is not complete
  if (!draftCompletedNow) {
    const nextPickInfo = await calculateNextPick(leagueId).catch(() => null);
    if (nextPickInfo) {
      wsManager.notifyNextPick(leagueId, {
        teamId: nextPickInfo.teamId,
        teamName: nextPickInfo.teamName,
        pickNumber: nextPickInfo.pickNumber,
        round: nextPickInfo.round,
      });
    }
  }

  console.log(`[AutoPick] Team ${teamId} auto-picked ${pickedAsset.name} (${targetPosition})`);
}
