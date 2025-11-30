/**
 * Auto-Lineup Generator
 * 
 * Automatically generates a weekly lineup from a team's roster
 * when no manual lineup has been set.
 */

import { getDb } from '../db';
import { rosters, weeklyLineups } from '../../drizzle/schema';
import { eq, and } from 'drizzle-orm';

interface RosterPlayer {
  id: number;
  teamId: number;
  assetType: string;
  assetId: number;
}

interface AutoLineup {
  teamId: number;
  year: number;
  week: number;
  mfg1Id: number | null;
  mfg2Id: number | null;
  cstr1Id: number | null;
  cstr2Id: number | null;
  prd1Id: number | null;
  prd2Id: number | null;
  phm1Id: number | null;
  phm2Id: number | null;
  brd1Id: number | null;
  flexId: number | null;
  flexType: string | null;
  locked: boolean;
}

/**
 * Generate a lineup from a team's roster
 * Follows the 10-position structure:
 * - 2 Manufacturers (MFG1, MFG2)
 * - 2 Cannabis Strains (CSTR1, CSTR2)
 * - 2 Products (PRD1, PRD2)
 * - 2 Pharmacies (PHM1, PHM2)
 * - 1 Brand (BRD1)
 * - 1 Flex (any type)
 */
export async function generateLineupFromRoster(
  teamId: number,
  year: number,
  week: number
): Promise<AutoLineup | null> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Fetch team's roster
  const rosterPlayers = await db
    .select()
    .from(rosters)
    .where(eq(rosters.teamId, teamId));

  if (rosterPlayers.length === 0) {
    console.log(`[AutoLineup] No roster found for team ${teamId}`);
    return null;
  }

  // Group players by asset type
  const manufacturers = rosterPlayers.filter(p => p.assetType === 'manufacturer');
  const cannabisStrains = rosterPlayers.filter(p => p.assetType === 'cannabis_strain');
  const products = rosterPlayers.filter(p => p.assetType === 'product');
  const pharmacies = rosterPlayers.filter(p => p.assetType === 'pharmacy');
  const brands = rosterPlayers.filter(p => p.assetType === 'brand');

  // Build lineup following position requirements
  const lineup: AutoLineup = {
    teamId,
    year,
    week,
    mfg1Id: manufacturers[0]?.assetId || null,
    mfg2Id: manufacturers[1]?.assetId || null,
    cstr1Id: cannabisStrains[0]?.assetId || null,
    cstr2Id: cannabisStrains[1]?.assetId || null,
    prd1Id: products[0]?.assetId || null,
    prd2Id: products[1]?.assetId || null,
    phm1Id: pharmacies[0]?.assetId || null,
    phm2Id: pharmacies[1]?.assetId || null,
    brd1Id: brands[0]?.assetId || null,
    flexId: null,
    flexType: null,
    locked: false,
  };

  // Fill FLEX slot with any remaining player
  // Priority: manufacturer > brand > cannabis_strain > product > pharmacy
  if (manufacturers[2]) {
    lineup.flexId = manufacturers[2].assetId;
    lineup.flexType = 'manufacturer';
  } else if (brands[1]) {
    lineup.flexId = brands[1].assetId;
    lineup.flexType = 'brand';
  } else if (cannabisStrains[2]) {
    lineup.flexId = cannabisStrains[2].assetId;
    lineup.flexType = 'cannabis_strain';
  } else if (products[2]) {
    lineup.flexId = products[2].assetId;
    lineup.flexType = 'product';
  } else if (pharmacies[2]) {
    lineup.flexId = pharmacies[2].assetId;
    lineup.flexType = 'pharmacy';
  }

  console.log(`[AutoLineup] Generated lineup for team ${teamId}, ${year}-W${week}`);
  return lineup;
}

/**
 * Get or create a lineup for a team/week
 * Returns existing lineup if found, otherwise generates from roster
 */
export async function getOrCreateLineup(
  teamId: number,
  year: number,
  week: number,
  _options?: { mode?: 'weekly' | 'daily'; statDate?: string }
): Promise<any | null> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // Check if lineup already exists
  const existingLineup = await db
    .select()
    .from(weeklyLineups)
    .where(and(
      eq(weeklyLineups.teamId, teamId),
      eq(weeklyLineups.year, year),
      eq(weeklyLineups.week, week)
    ))
    .limit(1);

  if (existingLineup.length > 0) {
    const lineup = existingLineup[0];
    console.log(`[AutoLineup] Using existing lineup for team ${teamId}, ${year}-W${week}, captainId=${lineup.captainId}, captainType=${lineup.captainType}`);
    return lineup;
  }

  // No lineup found, generate from roster
  console.log(`[AutoLineup] No lineup found for team ${teamId}, ${year}-W${week}, generating from roster...`);
  const autoLineup = await generateLineupFromRoster(teamId, year, week);

  if (!autoLineup) {
    console.log(`[AutoLineup] Could not generate lineup for team ${teamId} (no roster)`);
    return null;
  }

  // Save the auto-generated lineup to database
  const [savedLineup] = await db
    .insert(weeklyLineups)
    .values(autoLineup)
    .returning();

  console.log(`[AutoLineup] Saved auto-generated lineup for team ${teamId}, ${year}-W${week}`);
  return savedLineup;
}
