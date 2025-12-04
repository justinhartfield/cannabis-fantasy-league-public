/**
 * Challenge Auto-Draft
 * 
 * Automatically creates rosters and lineups for Daily Challenge teams
 * by randomly selecting from available assets in the database.
 */

import { eq, desc, and, sql, notInArray } from "drizzle-orm";
import { getDb } from "./db";
import { 
  rosters, 
  teams, 
  weeklyLineups, 
  leagues,
  manufacturers,
  cannabisStrains,
  pharmacies,
  brands,
  strains as products // products table
} from "../drizzle/schema";
import {
  manufacturerDailyChallengeStats,
  strainDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats,
  productDailyChallengeStats,
} from "../drizzle/dailyChallengeSchema";

interface AssetPick {
  assetType: string;
  assetId: number;
  name: string;
}

/**
 * Ensure lineup exists for a team, creating if missing
 */
async function ensureLineupExists(
  db: any, 
  teamId: number, 
  year: number, 
  week: number, 
  rosterEntries: { assetType: string; assetId: number }[]
) {
  // Check for existing lineup
  const [existingLineup] = await db
    .select()
    .from(weeklyLineups)
    .where(and(
      eq(weeklyLineups.teamId, teamId),
      eq(weeklyLineups.year, year),
      eq(weeklyLineups.week, week)
    ))
    .limit(1);

  // Check if lineup exists and has data
  const lineupHasData = existingLineup && (
    existingLineup.mfg1Id || existingLineup.mfg2Id ||
    existingLineup.cstr1Id || existingLineup.cstr2Id ||
    existingLineup.prd1Id || existingLineup.prd2Id ||
    existingLineup.phm1Id || existingLineup.phm2Id ||
    existingLineup.brd1Id || existingLineup.flexId
  );

  if (lineupHasData) {
    console.log(`[ChallengeAutoDraft] Lineup already exists with data for team ${teamId}`);
    return;
  }

  console.log(`[ChallengeAutoDraft] Creating/updating lineup for team ${teamId}...`);

  // Group roster by asset type
  const mfgPicks = rosterEntries.filter(r => r.assetType === 'manufacturer');
  const strainPicks = rosterEntries.filter(r => r.assetType === 'cannabis_strain');
  const prodPicks = rosterEntries.filter(r => r.assetType === 'product');
  const pharmPicks = rosterEntries.filter(r => r.assetType === 'pharmacy');
  const brandPicks = rosterEntries.filter(r => r.assetType === 'brand');

  const lineupData: any = {
    teamId,
    year,
    week,
    locked: false,
    mfg1Id: mfgPicks[0]?.assetId || null,
    mfg2Id: mfgPicks[1]?.assetId || null,
    cstr1Id: strainPicks[0]?.assetId || null,
    cstr2Id: strainPicks[1]?.assetId || null,
    prd1Id: prodPicks[0]?.assetId || null,
    prd2Id: prodPicks[1]?.assetId || null,
    phm1Id: pharmPicks[0]?.assetId || null,
    phm2Id: pharmPicks[1]?.assetId || null,
    brd1Id: brandPicks[0]?.assetId || null,
    flexId: null,
    flexType: null,
  };

  // Find flex from remaining roster
  const usedIds = new Set([
    mfgPicks[0]?.assetId, mfgPicks[1]?.assetId,
    strainPicks[0]?.assetId, strainPicks[1]?.assetId,
    prodPicks[0]?.assetId, prodPicks[1]?.assetId,
    pharmPicks[0]?.assetId, pharmPicks[1]?.assetId,
    brandPicks[0]?.assetId
  ].filter(Boolean));

  const flexCandidate = rosterEntries.find(r => !usedIds.has(r.assetId));
  if (flexCandidate) {
    lineupData.flexId = flexCandidate.assetId;
    lineupData.flexType = flexCandidate.assetType;
  }

  if (existingLineup) {
    await db.update(weeklyLineups)
      .set(lineupData)
      .where(eq(weeklyLineups.id, existingLineup.id));
    console.log(`[ChallengeAutoDraft] Updated existing empty lineup for team ${teamId}`);
  } else {
    await db.insert(weeklyLineups).values(lineupData);
    console.log(`[ChallengeAutoDraft] Created new lineup for team ${teamId}`);
  }
}

/**
 * Get top-performing assets of each type for today
 * Falls back to random selection if no stats available
 */
async function getAvailableAssets(excludeIds: Map<string, Set<number>>): Promise<{
  manufacturers: AssetPick[];
  strains: AssetPick[];
  products: AssetPick[];
  pharmacies: AssetPick[];
  brands: AssetPick[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date().toISOString().split('T')[0];

  // Get manufacturers (prefer those with stats, fallback to all)
  let mfgList = await db
    .select({
      assetId: manufacturers.id,
      name: manufacturers.name,
    })
    .from(manufacturerDailyChallengeStats)
    .innerJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id))
    .where(eq(manufacturerDailyChallengeStats.statDate, today))
    .orderBy(desc(manufacturerDailyChallengeStats.totalPoints))
    .limit(50);

  if (mfgList.length < 10) {
    // Fallback to any manufacturers
    mfgList = await db
      .select({ assetId: manufacturers.id, name: manufacturers.name })
      .from(manufacturers)
      .limit(50);
  }

  // Get cannabis strains
  let strainList = await db
    .select({
      assetId: cannabisStrains.id,
      name: cannabisStrains.name,
    })
    .from(strainDailyChallengeStats)
    .innerJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
    .where(eq(strainDailyChallengeStats.statDate, today))
    .orderBy(desc(strainDailyChallengeStats.totalPoints))
    .limit(50);

  if (strainList.length < 10) {
    strainList = await db
      .select({ assetId: cannabisStrains.id, name: cannabisStrains.name })
      .from(cannabisStrains)
      .limit(50);
  }

  // Get pharmacies
  let pharmList = await db
    .select({
      assetId: pharmacies.id,
      name: pharmacies.name,
    })
    .from(pharmacyDailyChallengeStats)
    .innerJoin(pharmacies, eq(pharmacyDailyChallengeStats.pharmacyId, pharmacies.id))
    .where(eq(pharmacyDailyChallengeStats.statDate, today))
    .orderBy(desc(pharmacyDailyChallengeStats.totalPoints))
    .limit(50);

  if (pharmList.length < 10) {
    pharmList = await db
      .select({ assetId: pharmacies.id, name: pharmacies.name })
      .from(pharmacies)
      .limit(50);
  }

  // Get brands
  let brandList = await db
    .select({
      assetId: brands.id,
      name: brands.name,
    })
    .from(brandDailyChallengeStats)
    .innerJoin(brands, eq(brandDailyChallengeStats.brandId, brands.id))
    .where(eq(brandDailyChallengeStats.statDate, today))
    .orderBy(desc(brandDailyChallengeStats.totalPoints))
    .limit(50);

  if (brandList.length < 10) {
    brandList = await db
      .select({ assetId: brands.id, name: brands.name })
      .from(brands)
      .limit(50);
  }

  // Get products
  let productList = await db
    .select({
      assetId: products.id,
      name: products.name,
    })
    .from(productDailyChallengeStats)
    .innerJoin(products, eq(productDailyChallengeStats.productId, products.id))
    .where(eq(productDailyChallengeStats.statDate, today))
    .orderBy(desc(productDailyChallengeStats.totalPoints))
    .limit(50);

  if (productList.length < 10) {
    productList = await db
      .select({ assetId: products.id, name: products.name })
      .from(products)
      .limit(50);
  }

  // Filter out excluded IDs and map to AssetPick format
  const filterAndMap = (list: { assetId: number; name: string }[], type: string): AssetPick[] => {
    const excluded = excludeIds.get(type) || new Set();
    return list
      .filter(item => !excluded.has(item.assetId))
      .map(item => ({ assetType: type, assetId: item.assetId, name: item.name || `${type} #${item.assetId}` }));
  };

  return {
    manufacturers: filterAndMap(mfgList, 'manufacturer'),
    strains: filterAndMap(strainList, 'cannabis_strain'),
    products: filterAndMap(productList, 'product'),
    pharmacies: filterAndMap(pharmList, 'pharmacy'),
    brands: filterAndMap(brandList, 'brand'),
  };
}

/**
 * Shuffle array randomly (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Auto-draft players for a Daily Challenge team
 * Picks random assets from each category to fill the roster
 */
export async function autoDraftForChallenge(
  teamId: number, 
  leagueId: number,
  excludeAssets: Map<string, Set<number>> = new Map()
): Promise<{ success: boolean; roster: AssetPick[]; message: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[ChallengeAutoDraft] Starting auto-draft for team ${teamId}, league ${leagueId}`);

  // Get league info for year/week (needed for lineup creation)
  const [league] = await db
    .select()
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1);

  if (!league) {
    console.error(`[ChallengeAutoDraft] ERROR: League ${leagueId} not found!`);
    throw new Error(`League ${leagueId} not found`);
  }

  console.log(`[ChallengeAutoDraft] League found: year=${league.seasonYear}, week=${league.currentWeek}`);

  // Check if team already has a roster
  const existingRoster = await db
    .select()
    .from(rosters)
    .where(eq(rosters.teamId, teamId));

  if (existingRoster.length > 0) {
    console.log(`[ChallengeAutoDraft] Team ${teamId} already has ${existingRoster.length} roster entries`);
    
    // IMPORTANT: Even if roster exists, check if lineup exists and create if missing
    await ensureLineupExists(db, teamId, league.seasonYear, league.currentWeek, existingRoster);
    
    return { 
      success: true, 
      roster: existingRoster.map(r => ({ assetType: r.assetType, assetId: r.assetId, name: '' })),
      message: "Team already has a roster (lineup verified)" 
    };
  }

  // Get available assets
  const assets = await getAvailableAssets(excludeAssets);
  
  // Shuffle for randomness
  const mfgs = shuffleArray(assets.manufacturers);
  const strains = shuffleArray(assets.strains);
  const prods = shuffleArray(assets.products);
  const pharms = shuffleArray(assets.pharmacies);
  const brnds = shuffleArray(assets.brands);

  // Build roster: 2 of each + 1 brand + 1 flex
  const roster: AssetPick[] = [];
  const pickedIds = new Map<string, Set<number>>();

  const pickAsset = (list: AssetPick[], type: string, count: number) => {
    const picked = pickedIds.get(type) || new Set();
    let added = 0;
    for (const asset of list) {
      if (added >= count) break;
      if (!picked.has(asset.assetId)) {
        roster.push(asset);
        picked.set(asset.assetId);
        added++;
      }
    }
    pickedIds.set(type, picked);
  };

  // Pick required slots
  pickAsset(mfgs, 'manufacturer', 2);
  pickAsset(strains, 'cannabis_strain', 2);
  pickAsset(prods, 'product', 2);
  pickAsset(pharms, 'pharmacy', 2);
  pickAsset(brnds, 'brand', 1);

  // Pick flex (any type, prefer variety)
  const flexCandidates = shuffleArray([
    ...mfgs.slice(2),
    ...strains.slice(2),
    ...prods.slice(2),
    ...pharms.slice(2),
    ...brnds.slice(1),
  ]);
  
  if (flexCandidates.length > 0) {
    roster.push(flexCandidates[0]);
  }

  console.log(`[ChallengeAutoDraft] Selected ${roster.length} assets for team ${teamId}`);

  if (roster.length < 10) {
    console.warn(`[ChallengeAutoDraft] Warning: Only ${roster.length} assets available for roster`);
  }

  // Insert into roster table
  const rosterEntries = roster.map(pick => ({
    teamId,
    assetType: pick.assetType,
    assetId: pick.assetId,
    acquiredWeek: 1,
    acquiredVia: "draft" as const,
  }));

  if (rosterEntries.length > 0) {
    await db.insert(rosters).values(rosterEntries);
    console.log(`[ChallengeAutoDraft] Inserted ${rosterEntries.length} roster entries`);
  }

  // Create lineup from roster (league already fetched at start of function)
  {
    const lineupData: any = {
      teamId,
      year: league.seasonYear,
      week: league.currentWeek,
      locked: false,
    };

    // Assign to lineup slots
    const mfgPicks = roster.filter(r => r.assetType === 'manufacturer');
    const strainPicks = roster.filter(r => r.assetType === 'cannabis_strain');
    const prodPicks = roster.filter(r => r.assetType === 'product');
    const pharmPicks = roster.filter(r => r.assetType === 'pharmacy');
    const brandPicks = roster.filter(r => r.assetType === 'brand');

    if (mfgPicks[0]) lineupData.mfg1Id = mfgPicks[0].assetId;
    if (mfgPicks[1]) lineupData.mfg2Id = mfgPicks[1].assetId;
    if (strainPicks[0]) lineupData.cstr1Id = strainPicks[0].assetId;
    if (strainPicks[1]) lineupData.cstr2Id = strainPicks[1].assetId;
    if (prodPicks[0]) lineupData.prd1Id = prodPicks[0].assetId;
    if (prodPicks[1]) lineupData.prd2Id = prodPicks[1].assetId;
    if (pharmPicks[0]) lineupData.phm1Id = pharmPicks[0].assetId;
    if (pharmPicks[1]) lineupData.phm2Id = pharmPicks[1].assetId;
    if (brandPicks[0]) lineupData.brd1Id = brandPicks[0].assetId;

    // Assign flex
    const flexPick = roster.find(r => 
      (r.assetType === 'manufacturer' && r !== mfgPicks[0] && r !== mfgPicks[1]) ||
      (r.assetType === 'cannabis_strain' && r !== strainPicks[0] && r !== strainPicks[1]) ||
      (r.assetType === 'product' && r !== prodPicks[0] && r !== prodPicks[1]) ||
      (r.assetType === 'pharmacy' && r !== pharmPicks[0] && r !== pharmPicks[1]) ||
      (r.assetType === 'brand' && r !== brandPicks[0])
    );
    
    if (flexPick) {
      lineupData.flexId = flexPick.assetId;
      lineupData.flexType = flexPick.assetType;
    }

    // Check if lineup exists
    const existingLineup = await db
      .select()
      .from(weeklyLineups)
      .where(and(
        eq(weeklyLineups.teamId, teamId),
        eq(weeklyLineups.year, lineupData.year),
        eq(weeklyLineups.week, lineupData.week)
      ))
      .limit(1);

    if (existingLineup.length === 0) {
      await db.insert(weeklyLineups).values(lineupData);
      console.log(`[ChallengeAutoDraft] Created lineup for team ${teamId}`);
    } else {
      await db.update(weeklyLineups)
        .set(lineupData)
        .where(eq(weeklyLineups.id, existingLineup[0].id));
      console.log(`[ChallengeAutoDraft] Updated lineup for team ${teamId}`);
    }
  }

  return {
    success: true,
    roster,
    message: `Auto-drafted ${roster.length} players for team`,
  };
}

/**
 * Auto-draft for both teams in a Daily Challenge
 * Ensures each team gets different players (snake draft style)
 */
export async function autoDraftChallenge(leagueId: number): Promise<{
  success: boolean;
  team1Result: { teamId: number; roster: AssetPick[] };
  team2Result: { teamId: number; roster: AssetPick[] };
  message: string;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  console.log(`[ChallengeAutoDraft] ========================================`);
  console.log(`[ChallengeAutoDraft] Starting challenge auto-draft for league ${leagueId}`);

  // Get both teams - ORDER BY ID to ensure consistent ordering
  const challengeTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(teams.id);

  if (challengeTeams.length !== 2) {
    console.error(`[ChallengeAutoDraft] ERROR: Expected 2 teams, found ${challengeTeams.length}`);
    throw new Error(`Challenge must have exactly 2 teams, found ${challengeTeams.length}`);
  }

  console.log(`[ChallengeAutoDraft] Team 1: ${challengeTeams[0].name} (ID: ${challengeTeams[0].id}, User: ${challengeTeams[0].userId})`);
  console.log(`[ChallengeAutoDraft] Team 2: ${challengeTeams[1].name} (ID: ${challengeTeams[1].id}, User: ${challengeTeams[1].userId})`);

  // Draft for team 1 first
  console.log(`[ChallengeAutoDraft] Drafting for team 1: ${challengeTeams[0].name}...`);
  const team1Result = await autoDraftForChallenge(challengeTeams[0].id, leagueId);
  console.log(`[ChallengeAutoDraft] Team 1 result: ${team1Result.message}, roster size: ${team1Result.roster.length}`);
  
  // Build exclusion map from team 1's picks
  const excludeIds = new Map<string, Set<number>>();
  for (const pick of team1Result.roster) {
    const existing = excludeIds.get(pick.assetType) || new Set();
    existing.add(pick.assetId);
    excludeIds.set(pick.assetType, existing);
  }

  // Draft for team 2 (excluding team 1's picks)
  console.log(`[ChallengeAutoDraft] Drafting for team 2: ${challengeTeams[1].name}...`);
  const team2Result = await autoDraftForChallenge(challengeTeams[1].id, leagueId, excludeIds);
  console.log(`[ChallengeAutoDraft] Team 2 result: ${team2Result.message}, roster size: ${team2Result.roster.length}`);

  // Update league status to 'active' since both teams now have rosters
  await db.update(leagues)
    .set({ status: 'active' })
    .where(eq(leagues.id, leagueId));

  console.log(`[ChallengeAutoDraft] Challenge ${leagueId} auto-draft complete. League status set to 'active'`);
  console.log(`[ChallengeAutoDraft] ========================================`);

  return {
    success: true,
    team1Result: { teamId: challengeTeams[0].id, roster: team1Result.roster },
    team2Result: { teamId: challengeTeams[1].id, roster: team2Result.roster },
    message: "Both teams auto-drafted successfully",
  };
}

export default {
  autoDraftForChallenge,
  autoDraftChallenge,
};

