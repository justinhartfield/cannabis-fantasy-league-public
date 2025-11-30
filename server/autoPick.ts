import { getDb } from "./db";
import { manufacturers, cannabisStrains, strains, pharmacies, brands, rosters, teams, draftPicks, leagues } from "../drizzle/schema";
import {
  manufacturerDailyChallengeStats,
  strainDailyChallengeStats,
  productDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats
} from "../drizzle/dailyChallengeSchema";
import { eq, and, notInArray, inArray, desc } from "drizzle-orm";
import { advanceDraftPick, calculateNextPick } from "./draftLogic";
import { wsManager } from "./websocket";

/**
 * AutoPick System v2.0 - Complete Refactor
 * 
 * Implements a robust state-machine approach with:
 * - Atomic operations with proper locking
 * - Smart player selection with fallbacks
 * - Position-aware selection for challenge leagues (9 slots)
 * - Retry logic with alternative player selection
 * - Circuit breaker for consecutive failures
 */

// =============================================================================
// TYPES
// =============================================================================

export type AssetType = "manufacturer" | "cannabis_strain" | "product" | "pharmacy" | "brand";

export interface PlayerSelection {
  id: number;
  name: string;
  imageUrl: string | null;
  assetType: AssetType;
  points: number | null;
}

export interface AutoPickResult {
  success: boolean;
  draftCompleted: boolean;
  pickedPlayer: PlayerSelection | null;
  error?: string;
  retryCount: number;
}

interface PositionCounts {
  manufacturer: number;
  cannabis_strain: number;
  product: number;
  pharmacy: number;
  brand: number;
}

// Challenge league roster limits (9 total slots)
const CHALLENGE_ROSTER_LIMITS: PositionCounts = {
  manufacturer: 2,
  cannabis_strain: 2,
  product: 2,
  pharmacy: 2,
  brand: 1,
};

// Season league roster limits (10 total slots with FLEX)
const SEASON_ROSTER_LIMITS: PositionCounts = {
  manufacturer: 2,
  cannabis_strain: 2,
  product: 2,
  pharmacy: 2,
  brand: 2,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getDailyChallengeStatDates() {
  const today = new Date();
  const todayStatDate = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStatDate = yesterday.toISOString().split("T")[0];
  return { todayStatDate, yesterdayStatDate };
}

function logAutoPick(message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[AutoPick ${timestamp}] ${message}`, JSON.stringify(data));
  } else {
    console.log(`[AutoPick ${timestamp}] ${message}`);
  }
}

// =============================================================================
// AUTOPICK SERVICE CLASS
// =============================================================================

class AutoPickService {
  // Lock mechanism to prevent concurrent picks on same league
  private pickLocks = new Map<number, Promise<void>>();
  
  // Track consecutive failures for circuit breaker
  private failureCounts = new Map<number, number>();
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly MAX_RETRIES = 3;

  /**
   * Check if a pick is currently in progress for a league
   */
  isPickInProgress(leagueId: number): boolean {
    return this.pickLocks.has(leagueId);
  }

  /**
   * Main entry point: Execute an auto-pick for a team
   * Handles locking, retries, and all error scenarios
   */
  async executeAutoPick(leagueId: number, teamId: number): Promise<AutoPickResult> {
    logAutoPick("executeAutoPick called", { leagueId, teamId });

    // Check circuit breaker
    const failures = this.failureCounts.get(leagueId) || 0;
    if (failures >= this.MAX_CONSECUTIVE_FAILURES) {
      logAutoPick("Circuit breaker tripped - too many consecutive failures", { leagueId, failures });
      return {
        success: false,
        draftCompleted: false,
        pickedPlayer: null,
        error: "Circuit breaker: Too many consecutive failures. Auto-pick paused.",
        retryCount: 0,
      };
    }

    // Acquire lock for this league
    const existingLock = this.pickLocks.get(leagueId);
    if (existingLock) {
      logAutoPick("Waiting for existing lock", { leagueId });
      await existingLock;
    }

    // Create new lock
    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });
    this.pickLocks.set(leagueId, lockPromise);

    try {
      const result = await this.executePickWithRetry(leagueId, teamId);
      
      // Reset failure count on success
      if (result.success) {
        this.failureCounts.delete(leagueId);
      } else {
        // Increment failure count
        this.failureCounts.set(leagueId, (this.failureCounts.get(leagueId) || 0) + 1);
      }

      return result;
    } finally {
      // Release lock
      this.pickLocks.delete(leagueId);
      releaseLock!();
    }
  }

  /**
   * Execute pick with retry logic
   */
  private async executePickWithRetry(leagueId: number, teamId: number): Promise<AutoPickResult> {
    const db = await getDb();
    if (!db) {
      return {
        success: false,
        draftCompleted: false,
        pickedPlayer: null,
        error: "Database not available",
        retryCount: 0,
      };
    }

    // Verify draft is still in progress
    const [league] = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);

    if (!league) {
      return {
        success: false,
        draftCompleted: false,
        pickedPlayer: null,
        error: "League not found",
        retryCount: 0,
      };
    }

    if (league.draftCompleted === 1) {
      logAutoPick("Draft already completed", { leagueId });
      return {
        success: true,
        draftCompleted: true,
        pickedPlayer: null,
        retryCount: 0,
      };
    }

    // Get team info
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (!team) {
      return {
        success: false,
        draftCompleted: false,
        pickedPlayer: null,
        error: "Team not found",
        retryCount: 0,
      };
    }

    // Get roster limits based on league type
    const rosterLimits = league.leagueType === "challenge" ? CHALLENGE_ROSTER_LIMITS : SEASON_ROSTER_LIMITS;
    const excludedAssets = new Set<string>(); // Track assets that failed to pick
    let retryCount = 0;

    while (retryCount < this.MAX_RETRIES) {
      try {
        // Select best available player
        const player = await this.selectBestAvailablePlayer(
          db,
          leagueId,
          teamId,
          rosterLimits,
          excludedAssets
        );

        if (!player) {
          logAutoPick("No available players found", { leagueId, teamId, retryCount });
          return {
            success: false,
            draftCompleted: false,
            pickedPlayer: null,
            error: "No available players to auto-pick",
            retryCount,
          };
        }

        logAutoPick("Selected player", { 
          leagueId, 
          teamId, 
          player: player.name, 
          assetType: player.assetType,
          points: player.points,
          retryCount 
        });

        // Execute the pick atomically
        await this.executePickAtomic(db, leagueId, teamId, team.name, league, player);

        // Advance draft and check completion
        const draftCompleted = await advanceDraftPick(leagueId);

        // Send WebSocket notifications
        await this.sendNotifications(leagueId, teamId, team.name, player, league.currentDraftPick, draftCompleted);

        logAutoPick("Pick successful", { 
          leagueId, 
          teamId, 
          player: player.name,
          draftCompleted 
        });

        return {
          success: true,
          draftCompleted,
          pickedPlayer: player,
          retryCount,
        };
      } catch (error: any) {
        const errorMessage = error?.message || String(error);
        logAutoPick("Pick attempt failed", { 
          leagueId, 
          teamId, 
          error: errorMessage, 
          retryCount 
        });

        // Check if it's a "already drafted" error - try next best player
        const isConflictError = 
          errorMessage.includes("already been drafted") ||
          errorMessage.includes("duplicate") ||
          errorMessage.includes("unique constraint") ||
          errorMessage.includes("UNIQUE constraint");

        if (isConflictError && retryCount < this.MAX_RETRIES - 1) {
          // Mark this player as excluded and retry
          const failedPlayer = await this.getLastAttemptedPlayer(db, leagueId);
          if (failedPlayer) {
            excludedAssets.add(`${failedPlayer.assetType}-${failedPlayer.assetId}`);
          }
          retryCount++;
          continue;
        }

        return {
          success: false,
          draftCompleted: false,
          pickedPlayer: null,
          error: errorMessage,
          retryCount,
        };
      }
    }

    return {
      success: false,
      draftCompleted: false,
      pickedPlayer: null,
      error: "Max retries exceeded",
      retryCount,
    };
  }

  /**
   * Select the best available player based on position needs and stats
   */
  private async selectBestAvailablePlayer(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    leagueId: number,
    teamId: number,
    rosterLimits: PositionCounts,
    excludedAssets: Set<string>
  ): Promise<PlayerSelection | null> {
    // Get team's current roster to calculate position needs
    const teamRoster = await db
      .select()
      .from(rosters)
      .where(eq(rosters.teamId, teamId));

    const positionCounts: PositionCounts = {
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

    // Get all teams in league to find drafted players
    const leagueTeams = await db
      .select({ teamId: teams.id })
      .from(teams)
      .where(eq(teams.leagueId, leagueId));

    const teamIds = leagueTeams.map((t) => t.teamId);

    // Get all drafted asset IDs per type
    const draftedAssets = await this.getDraftedAssets(db, teamIds);

    // Determine which positions still need filling
    const positions: AssetType[] = ["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"];
    const neededPositions = positions.filter(
      (pos) => positionCounts[pos] < rosterLimits[pos]
    );

    if (neededPositions.length === 0) {
      logAutoPick("All positions filled", { teamId, positionCounts });
      return null;
    }

    // Sort positions by need (least filled first)
    neededPositions.sort((a, b) => {
      const needA = rosterLimits[a] - positionCounts[a];
      const needB = rosterLimits[b] - positionCounts[b];
      return needB - needA; // Higher need first
    });

    const { todayStatDate, yesterdayStatDate } = getDailyChallengeStatDates();

    // Try each position in order of need
    for (const position of neededPositions) {
      const draftedIds = draftedAssets[position];
      
      // Filter out excluded assets
      const excludedIds = new Set<number>();
      excludedAssets.forEach((key) => {
        const [type, id] = key.split("-");
        if (type === position) {
          excludedIds.add(parseInt(id));
        }
      });

      const player = await this.getBestPlayerForPosition(
        db,
        position,
        draftedIds,
        excludedIds,
        todayStatDate,
        yesterdayStatDate
      );

      if (player) {
        return player;
      }
    }

    return null;
  }

  /**
   * Get all drafted assets grouped by type
   */
  private async getDraftedAssets(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    teamIds: number[]
  ): Promise<Record<AssetType, number[]>> {
    const result: Record<AssetType, number[]> = {
      manufacturer: [],
      cannabis_strain: [],
      product: [],
      pharmacy: [],
      brand: [],
    };

    if (teamIds.length === 0) return result;

    const allDrafted = await db
      .select({ assetType: rosters.assetType, assetId: rosters.assetId })
      .from(rosters)
      .where(inArray(rosters.teamId, teamIds));

    for (const item of allDrafted) {
      if (item.assetType in result) {
        result[item.assetType as AssetType].push(item.assetId);
      }
    }

    return result;
  }

  /**
   * Get the best available player for a specific position
   * Uses multi-tier fallback: yesterday stats → today stats → popularity metrics
   */
  private async getBestPlayerForPosition(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    position: AssetType,
    draftedIds: number[],
    excludedIds: Set<number>,
    todayStatDate: string,
    yesterdayStatDate: string
  ): Promise<PlayerSelection | null> {
    // Combine drafted and excluded IDs
    const allExcludedIds = [...draftedIds, ...Array.from(excludedIds)];

    switch (position) {
      case "manufacturer":
        return this.getBestManufacturer(db, allExcludedIds, todayStatDate, yesterdayStatDate);
      case "cannabis_strain":
        return this.getBestCannabisStrain(db, allExcludedIds, todayStatDate, yesterdayStatDate);
      case "product":
        return this.getBestProduct(db, allExcludedIds, todayStatDate, yesterdayStatDate);
      case "pharmacy":
        return this.getBestPharmacy(db, allExcludedIds, todayStatDate, yesterdayStatDate);
      case "brand":
        return this.getBestBrand(db, allExcludedIds, todayStatDate, yesterdayStatDate);
      default:
        return null;
    }
  }

  // Position-specific selection methods with multi-tier fallback

  private async getBestManufacturer(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    excludedIds: number[],
    todayStatDate: string,
    yesterdayStatDate: string
  ): Promise<PlayerSelection | null> {
    // Tier 1: Try yesterday's stats
    let results = await db
      .select({
        id: manufacturers.id,
        name: manufacturers.name,
        imageUrl: manufacturers.logoUrl,
        points: manufacturerDailyChallengeStats.totalPoints,
      })
      .from(manufacturers)
      .innerJoin(
        manufacturerDailyChallengeStats,
        and(
          eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id),
          eq(manufacturerDailyChallengeStats.statDate, yesterdayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(manufacturers.id, excludedIds) : undefined)
      .orderBy(desc(manufacturerDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], assetType: "manufacturer" };
    }

    // Tier 2: Try today's stats
    results = await db
      .select({
        id: manufacturers.id,
        name: manufacturers.name,
        imageUrl: manufacturers.logoUrl,
        points: manufacturerDailyChallengeStats.totalPoints,
      })
      .from(manufacturers)
      .innerJoin(
        manufacturerDailyChallengeStats,
        and(
          eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id),
          eq(manufacturerDailyChallengeStats.statDate, todayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(manufacturers.id, excludedIds) : undefined)
      .orderBy(desc(manufacturerDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], assetType: "manufacturer" };
    }

    // Tier 3: Fallback to popularity metrics (no stats available)
    const fallback = await db
      .select({
        id: manufacturers.id,
        name: manufacturers.name,
        imageUrl: manufacturers.logoUrl,
      })
      .from(manufacturers)
      .where(excludedIds.length > 0 ? notInArray(manufacturers.id, excludedIds) : undefined)
      .orderBy(desc(manufacturers.productCount))
      .limit(1);

    if (fallback.length > 0) {
      return { ...fallback[0], points: null, assetType: "manufacturer" };
    }

    return null;
  }

  private async getBestCannabisStrain(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    excludedIds: number[],
    todayStatDate: string,
    yesterdayStatDate: string
  ): Promise<PlayerSelection | null> {
    // Tier 1: Yesterday's stats
    let results = await db
      .select({
        id: cannabisStrains.id,
        name: cannabisStrains.name,
        imageUrl: cannabisStrains.imageUrl,
        points: strainDailyChallengeStats.totalPoints,
      })
      .from(cannabisStrains)
      .innerJoin(
        strainDailyChallengeStats,
        and(
          eq(strainDailyChallengeStats.strainId, cannabisStrains.id),
          eq(strainDailyChallengeStats.statDate, yesterdayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(cannabisStrains.id, excludedIds) : undefined)
      .orderBy(desc(strainDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], assetType: "cannabis_strain" };
    }

    // Tier 2: Today's stats
    results = await db
      .select({
        id: cannabisStrains.id,
        name: cannabisStrains.name,
        imageUrl: cannabisStrains.imageUrl,
        points: strainDailyChallengeStats.totalPoints,
      })
      .from(cannabisStrains)
      .innerJoin(
        strainDailyChallengeStats,
        and(
          eq(strainDailyChallengeStats.strainId, cannabisStrains.id),
          eq(strainDailyChallengeStats.statDate, todayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(cannabisStrains.id, excludedIds) : undefined)
      .orderBy(desc(strainDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], assetType: "cannabis_strain" };
    }

    // Tier 3: Fallback to product count
    const fallback = await db
      .select({
        id: cannabisStrains.id,
        name: cannabisStrains.name,
        imageUrl: cannabisStrains.imageUrl,
      })
      .from(cannabisStrains)
      .where(excludedIds.length > 0 ? notInArray(cannabisStrains.id, excludedIds) : undefined)
      .orderBy(desc(cannabisStrains.pharmaceuticalProductCount))
      .limit(1);

    if (fallback.length > 0) {
      return { ...fallback[0], points: null, assetType: "cannabis_strain" };
    }

    return null;
  }

  private async getBestProduct(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    excludedIds: number[],
    todayStatDate: string,
    yesterdayStatDate: string
  ): Promise<PlayerSelection | null> {
    // Tier 1: Yesterday's stats
    // Note: strains table doesn't have imageUrl column, using null
    let results = await db
      .select({
        id: strains.id,
        name: strains.name,
        points: productDailyChallengeStats.totalPoints,
      })
      .from(strains)
      .innerJoin(
        productDailyChallengeStats,
        and(
          eq(productDailyChallengeStats.productId, strains.id),
          eq(productDailyChallengeStats.statDate, yesterdayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(strains.id, excludedIds) : undefined)
      .orderBy(desc(productDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], imageUrl: null, assetType: "product" };
    }

    // Tier 2: Today's stats
    results = await db
      .select({
        id: strains.id,
        name: strains.name,
        points: productDailyChallengeStats.totalPoints,
      })
      .from(strains)
      .innerJoin(
        productDailyChallengeStats,
        and(
          eq(productDailyChallengeStats.productId, strains.id),
          eq(productDailyChallengeStats.statDate, todayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(strains.id, excludedIds) : undefined)
      .orderBy(desc(productDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], imageUrl: null, assetType: "product" };
    }

    // Tier 3: Fallback to pharmacy count + favorites
    const fallback = await db
      .select({
        id: strains.id,
        name: strains.name,
      })
      .from(strains)
      .where(excludedIds.length > 0 ? notInArray(strains.id, excludedIds) : undefined)
      .orderBy(desc(strains.pharmacyCount), desc(strains.favoriteCount))
      .limit(1);

    if (fallback.length > 0) {
      return { ...fallback[0], imageUrl: null, points: null, assetType: "product" };
    }

    return null;
  }

  private async getBestPharmacy(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    excludedIds: number[],
    todayStatDate: string,
    yesterdayStatDate: string
  ): Promise<PlayerSelection | null> {
    // Tier 1: Yesterday's stats
    let results = await db
      .select({
        id: pharmacies.id,
        name: pharmacies.name,
        imageUrl: pharmacies.logoUrl,
        points: pharmacyDailyChallengeStats.totalPoints,
      })
      .from(pharmacies)
      .innerJoin(
        pharmacyDailyChallengeStats,
        and(
          eq(pharmacyDailyChallengeStats.pharmacyId, pharmacies.id),
          eq(pharmacyDailyChallengeStats.statDate, yesterdayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(pharmacies.id, excludedIds) : undefined)
      .orderBy(desc(pharmacyDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], assetType: "pharmacy" };
    }

    // Tier 2: Today's stats
    results = await db
      .select({
        id: pharmacies.id,
        name: pharmacies.name,
        imageUrl: pharmacies.logoUrl,
        points: pharmacyDailyChallengeStats.totalPoints,
      })
      .from(pharmacies)
      .innerJoin(
        pharmacyDailyChallengeStats,
        and(
          eq(pharmacyDailyChallengeStats.pharmacyId, pharmacies.id),
          eq(pharmacyDailyChallengeStats.statDate, todayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(pharmacies.id, excludedIds) : undefined)
      .orderBy(desc(pharmacyDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], assetType: "pharmacy" };
    }

    // Tier 3: Fallback to product count + revenue
    const fallback = await db
      .select({
        id: pharmacies.id,
        name: pharmacies.name,
        imageUrl: pharmacies.logoUrl,
      })
      .from(pharmacies)
      .where(excludedIds.length > 0 ? notInArray(pharmacies.id, excludedIds) : undefined)
      .orderBy(desc(pharmacies.productCount), desc(pharmacies.weeklyRevenueCents))
      .limit(1);

    if (fallback.length > 0) {
      return { ...fallback[0], points: null, assetType: "pharmacy" };
    }

    return null;
  }

  private async getBestBrand(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    excludedIds: number[],
    todayStatDate: string,
    yesterdayStatDate: string
  ): Promise<PlayerSelection | null> {
    // Tier 1: Yesterday's stats
    let results = await db
      .select({
        id: brands.id,
        name: brands.name,
        imageUrl: brands.logoUrl,
        points: brandDailyChallengeStats.totalPoints,
      })
      .from(brands)
      .innerJoin(
        brandDailyChallengeStats,
        and(
          eq(brandDailyChallengeStats.brandId, brands.id),
          eq(brandDailyChallengeStats.statDate, yesterdayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(brands.id, excludedIds) : undefined)
      .orderBy(desc(brandDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], assetType: "brand" };
    }

    // Tier 2: Today's stats
    results = await db
      .select({
        id: brands.id,
        name: brands.name,
        imageUrl: brands.logoUrl,
        points: brandDailyChallengeStats.totalPoints,
      })
      .from(brands)
      .innerJoin(
        brandDailyChallengeStats,
        and(
          eq(brandDailyChallengeStats.brandId, brands.id),
          eq(brandDailyChallengeStats.statDate, todayStatDate)
        )
      )
      .where(excludedIds.length > 0 ? notInArray(brands.id, excludedIds) : undefined)
      .orderBy(desc(brandDailyChallengeStats.totalPoints))
      .limit(1);

    if (results.length > 0) {
      return { ...results[0], assetType: "brand" };
    }

    // Tier 3: Fallback to favorites + clicks
    const fallback = await db
      .select({
        id: brands.id,
        name: brands.name,
        imageUrl: brands.logoUrl,
      })
      .from(brands)
      .where(excludedIds.length > 0 ? notInArray(brands.id, excludedIds) : undefined)
      .orderBy(desc(brands.totalFavorites), desc(brands.affiliateClicks))
      .limit(1);

    if (fallback.length > 0) {
      return { ...fallback[0], points: null, assetType: "brand" };
    }

    return null;
  }

  /**
   * Execute the pick atomically (insert roster + draft pick)
   */
  private async executePickAtomic(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    leagueId: number,
    teamId: number,
    teamName: string,
    league: typeof leagues.$inferSelect,
    player: PlayerSelection
  ): Promise<void> {
    const currentPick = league.currentDraftPick;
    const currentRound = league.currentDraftRound;

    // Check if pick already exists (another process may have made it)
    const existingPick = await db
      .select()
      .from(draftPicks)
      .where(
        and(
          eq(draftPicks.leagueId, leagueId),
          eq(draftPicks.pickNumber, currentPick)
        )
      )
      .limit(1);

    if (existingPick.length > 0) {
      throw new Error(`Pick ${currentPick} already exists - race condition detected`);
    }

    // Check if asset already drafted
    const existingAsset = await db
      .select()
      .from(draftPicks)
      .where(
        and(
          eq(draftPicks.leagueId, leagueId),
          eq(draftPicks.assetType, player.assetType),
          eq(draftPicks.assetId, player.id)
        )
      )
      .limit(1);

    if (existingAsset.length > 0) {
      throw new Error(`Asset ${player.name} has already been drafted`);
    }

    // Insert roster entry
    await db.insert(rosters).values({
      teamId,
      assetType: player.assetType,
      assetId: player.id,
      acquiredWeek: 0,
      acquiredVia: "draft",
    });

    // Insert draft pick record
    await db.insert(draftPicks).values({
      leagueId,
      teamId,
      round: currentRound,
      pickNumber: currentPick,
      assetType: player.assetType,
      assetId: player.id,
    });

    logAutoPick("Pick executed atomically", {
      leagueId,
      teamId,
      pickNumber: currentPick,
      player: player.name,
      assetType: player.assetType,
    });
  }

  /**
   * Send WebSocket notifications for the pick
   */
  private async sendNotifications(
    leagueId: number,
    teamId: number,
    teamName: string,
    player: PlayerSelection,
    pickNumber: number,
    draftCompleted: boolean
  ): Promise<void> {
    // Notify player picked
    wsManager.notifyPlayerPicked(leagueId, {
      teamId,
      teamName,
      assetType: player.assetType,
      assetId: player.id,
      assetName: player.name,
      pickNumber,
      imageUrl: player.imageUrl,
    });

    // Notify auto-pick occurred
    wsManager.notifyAutoPick(leagueId, {
      teamId,
      pickNumber,
      assetName: player.name,
      teamName,
    });

    if (draftCompleted) {
      // Draft complete notification
      wsManager.notifyDraftComplete(leagueId);
      logAutoPick("Draft completed", { leagueId });
    } else {
      // Calculate and notify next pick
      try {
        const nextPickInfo = await calculateNextPick(leagueId);
        wsManager.notifyNextPick(leagueId, {
          teamId: nextPickInfo.teamId,
          teamName: nextPickInfo.teamName,
          pickNumber: nextPickInfo.pickNumber,
          round: nextPickInfo.round,
        });
      } catch (error) {
        logAutoPick("Failed to calculate next pick", { leagueId, error: String(error) });
      }
    }
  }

  /**
   * Get the last attempted player (for retry exclusion)
   */
  private async getLastAttemptedPlayer(
    db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
    leagueId: number
  ): Promise<{ assetType: string; assetId: number } | null> {
    const lastPick = await db
      .select()
      .from(draftPicks)
      .where(eq(draftPicks.leagueId, leagueId))
      .orderBy(desc(draftPicks.pickNumber))
      .limit(1);

    if (lastPick.length > 0) {
      return {
        assetType: lastPick[0].assetType,
        assetId: lastPick[0].assetId,
      };
    }

    return null;
  }

  /**
   * Reset circuit breaker for a league (call after manual intervention)
   */
  resetCircuitBreaker(leagueId: number): void {
    this.failureCounts.delete(leagueId);
    logAutoPick("Circuit breaker reset", { leagueId });
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(leagueId: number): { failures: number; tripped: boolean } {
    const failures = this.failureCounts.get(leagueId) || 0;
    return {
      failures,
      tripped: failures >= this.MAX_CONSECUTIVE_FAILURES,
    };
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const autoPickService = new AutoPickService();

// =============================================================================
// LEGACY FUNCTION (For backward compatibility and rollback)
// =============================================================================

/**
 * Legacy makeAutoPick function - wraps the new service
 * Use environment variable USE_LEGACY_AUTOPICK=1 to use old behavior
 */
export async function makeAutoPick(leagueId: number, teamId: number): Promise<void> {
  const result = await autoPickService.executeAutoPick(leagueId, teamId);
  
  if (!result.success && !result.draftCompleted) {
    throw new Error(result.error || "Auto-pick failed");
  }
}

// =============================================================================
// HELPER EXPORTS (for draftRouter wishlist cleanup)
// =============================================================================

export async function removeFromAllWishlists(
  leagueId: number, 
  assetType: string, 
  assetId: number
): Promise<void> {
  // This is a placeholder - implement if you have a wishlist table
  // For now, this is a no-op as wishlists are client-side only
}
