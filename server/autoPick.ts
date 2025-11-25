import { getDb } from "./db";
import { manufacturers, cannabisStrains, strains, pharmacies, brands, rosters, teams, draftPicks, leagues, autoDraftBoards } from "../drizzle/schema";
import { eq, and, notInArray, inArray, desc, asc } from "drizzle-orm";
import { advanceDraftPick, calculateNextPick } from "./draftLogic";
import { wsManager } from "./websocket";

/**
 * Auto-Pick System
 * 
 * Automatically selects a player when timer expires
 * Priority:
 * 1. First tries to pick from user's auto-draft board (wishlist) based on priority
 * 2. Falls back to "best available" strategy based on position needs
 */

type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

/**
 * Get the name of an asset by type and ID
 */
async function getAssetName(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  assetType: AssetType,
  assetId: number
): Promise<string> {
  switch (assetType) {
    case "manufacturer": {
      const [mfg] = await db.select().from(manufacturers).where(eq(manufacturers.id, assetId)).limit(1);
      return mfg?.name || "Unknown";
    }
    case "cannabis_strain": {
      const [strain] = await db.select().from(cannabisStrains).where(eq(cannabisStrains.id, assetId)).limit(1);
      return strain?.name || "Unknown";
    }
    case "product": {
      const [product] = await db.select().from(strains).where(eq(strains.id, assetId)).limit(1);
      return product?.name || "Unknown";
    }
    case "pharmacy": {
      const [phm] = await db.select().from(pharmacies).where(eq(pharmacies.id, assetId)).limit(1);
      return phm?.name || "Unknown";
    }
    case "brand": {
      const [brand] = await db.select().from(brands).where(eq(brands.id, assetId)).limit(1);
      return brand?.name || "Unknown";
    }
    default:
      return "Unknown";
  }
}

/**
 * Check if an asset is available (not already drafted by any team in the league)
 */
async function isAssetAvailable(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  leagueId: number,
  assetType: AssetType,
  assetId: number
): Promise<boolean> {
  const leagueTeams = await db
    .select({ teamId: teams.id })
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  const teamIds = leagueTeams.map((t) => t.teamId);

  if (teamIds.length === 0) return true;

  const drafted = await db
    .select()
    .from(rosters)
    .where(
      and(
        inArray(rosters.teamId, teamIds),
        eq(rosters.assetType, assetType),
        eq(rosters.assetId, assetId)
      )
    )
    .limit(1);

  return drafted.length === 0;
}

/**
 * Try to pick from the team's auto-draft board (wishlist)
 * Returns the picked asset or null if no available asset found in wishlist
 */
async function tryPickFromWishlist(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  leagueId: number,
  teamId: number
): Promise<{ assetType: AssetType; assetId: number; name: string } | null> {
  // Get the team's wishlist ordered by priority (ascending = highest priority first)
  const wishlist = await db
    .select()
    .from(autoDraftBoards)
    .where(eq(autoDraftBoards.teamId, teamId))
    .orderBy(asc(autoDraftBoards.priority));

  if (wishlist.length === 0) {
    console.log(`[AutoPick] No wishlist found for team ${teamId}`);
    return null;
  }

  console.log(`[AutoPick] Team ${teamId} has ${wishlist.length} items in wishlist`);

  // Try each item in the wishlist, picking the first available one
  for (const item of wishlist) {
    const assetType = item.assetType as AssetType;
    const available = await isAssetAvailable(db, leagueId, assetType, item.assetId);

    if (available) {
      const name = await getAssetName(db, assetType, item.assetId);
      console.log(`[AutoPick] Found available wishlist item: ${name} (${assetType})`);
      return { assetType, assetId: item.assetId, name };
    } else {
      console.log(`[AutoPick] Wishlist item ${item.assetId} (${assetType}) already drafted, trying next...`);
    }
  }

  console.log(`[AutoPick] No available assets found in wishlist for team ${teamId}`);
  return null;
}

/**
 * Pick best available player based on position needs (fallback strategy)
 */
async function pickBestAvailable(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  leagueId: number,
  teamId: number
): Promise<{ assetType: AssetType; assetId: number; name: string } | null> {
  // Get team's current roster
  const teamRoster = await db
    .select()
    .from(rosters)
    .where(eq(rosters.teamId, teamId));

  // Count positions
  const positionCounts: Record<AssetType, number> = {
    manufacturer: 0,
    cannabis_strain: 0,
    product: 0,
    pharmacy: 0,
    brand: 0,
  };

  for (const item of teamRoster) {
    if (item.assetType in positionCounts) {
      positionCounts[item.assetType as AssetType]++;
    }
  }

  // Determine which position to draft (least filled)
  let targetPosition: AssetType = "manufacturer";
  let minCount = positionCounts.manufacturer;

  for (const [position, count] of Object.entries(positionCounts)) {
    if (count < minCount) {
      targetPosition = position as AssetType;
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

  // Get best available player for target position
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
    return null;
  }

  return { assetType: targetPosition, assetId: pickedAsset.id, name: pickedAsset.name };
}

/**
 * Remove a drafted asset from all teams' wishlists in the league
 */
export async function removeFromAllWishlists(
  leagueId: number,
  assetType: AssetType,
  assetId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Get all teams in this league
  const leagueTeams = await db
    .select({ teamId: teams.id })
    .from(teams)
    .where(eq(teams.leagueId, leagueId));

  const teamIds = leagueTeams.map((t) => t.teamId);

  if (teamIds.length === 0) return;

  // Delete from all wishlists
  await db
    .delete(autoDraftBoards)
    .where(
      and(
        inArray(autoDraftBoards.teamId, teamIds),
        eq(autoDraftBoards.assetType, assetType),
        eq(autoDraftBoards.assetId, assetId)
      )
    );

  console.log(`[AutoPick] Removed ${assetType} ${assetId} from all wishlists in league ${leagueId}`);
}

/**
 * Main auto-pick function
 */
export async function makeAutoPick(leagueId: number, teamId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[AutoPick] Starting auto-pick for team ${teamId} in league ${leagueId}`);

  // First, try to pick from the team's wishlist
  let pickedAsset = await tryPickFromWishlist(db, leagueId, teamId);
  let pickedFromWishlist = pickedAsset !== null;

  // If no wishlist or no available items in wishlist, fall back to best available
  if (!pickedAsset) {
    console.log(`[AutoPick] Falling back to best available strategy`);
    pickedAsset = await pickBestAvailable(db, leagueId, teamId);
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
    assetType: pickedAsset.assetType,
    assetId: pickedAsset.assetId,
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
      assetType: pickedAsset.assetType,
      assetId: pickedAsset.assetId,
    });
  }

  // Remove the drafted asset from all wishlists in the league
  await removeFromAllWishlists(leagueId, pickedAsset.assetType, pickedAsset.assetId);

  // Notify all clients about the auto-pick
  wsManager.notifyAutoPick(leagueId, {
    teamId,
    teamName: team?.name || "Unknown Team",
    assetType: pickedAsset.assetType,
    assetId: pickedAsset.assetId,
    assetName: pickedAsset.name,
    pickNumber: draftStatus[0]?.currentDraftPick || 0,
    fromWishlist: pickedFromWishlist,
  });

  // Also send standard player_picked event for consistency
  wsManager.notifyPlayerPicked(leagueId, {
    teamId,
    teamName: team?.name || "Unknown Team",
    assetType: pickedAsset.assetType,
    assetId: pickedAsset.assetId,
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

  const source = pickedFromWishlist ? "wishlist" : "best available";
  console.log(`[AutoPick] Team ${teamId} auto-picked ${pickedAsset.name} (${pickedAsset.assetType}) from ${source}`);
}
