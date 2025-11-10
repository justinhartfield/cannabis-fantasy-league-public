import { getDb } from "./db";
import { rosters, manufacturers, cannabisStrains, products, pharmacies } from "../drizzle/schema";
import { eq, and, notInArray, sql } from "drizzle-orm";

async function completeDraft() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }
  const leagueId = 6;
  const teamId = 1; // Green Dragons (draftuser1's team)
  
  console.log("=== Completing Draft for League 6, Team 1 ===\n");
  
  // Check current roster
  const currentRoster = await db.select().from(rosters).where(eq(rosters.teamId, teamId));
  console.log(`Current roster size: ${currentRoster.length} players`);
  console.log("Current picks:");
  currentRoster.forEach(r => {
    console.log(`  - ${r.assetType}: ${r.assetId} (Round ${r.draftRound}, Pick ${r.draftPick})`);
  });
  
  // Get drafted asset IDs by type
  const draftedStrainIds = currentRoster
    .filter(r => r.assetType === "cannabisStrain")
    .map(r => r.assetId);
  
  console.log(`\nDrafted strains: ${draftedStrainIds.length}/2`);
  console.log("Need to draft: 2 Manufacturers, 2 Products, 2 Pharmacies, 1 Flex\n");
  
  // Draft 2 Manufacturers (Picks 3-4)
  const availableManufacturers = await db.select()
    .from(manufacturers)
    .limit(2);
  
  console.log("Drafting 2 Manufacturers:");
  for (let i = 0; i < 2; i++) {
    const mfg = availableManufacturers[i];
    const pick = 3 + i;
    await db.insert(rosters).values({
      teamId,
      assetType: "manufacturer",
      assetId: mfg.id,
      draftRound: pick,
      draftPick: pick,
      acquisitionType: "draft"
    });
    console.log(`  Pick ${pick}: ${mfg.name} (ID: ${mfg.id})`);
  }
  
  // Draft 2 Products (Picks 5-6)
  const availableProducts = await db.select()
    .from(products)
    .limit(2);
  
  console.log("\nDrafting 2 Products:");
  for (let i = 0; i < 2; i++) {
    const product = availableProducts[i];
    const pick = 5 + i;
    await db.insert(rosters).values({
      teamId,
      assetType: "product",
      assetId: product.id,
      draftRound: pick,
      draftPick: pick,
      acquisitionType: "draft"
    });
    console.log(`  Pick ${pick}: ${product.name} (ID: ${product.id})`);
  }
  
  // Draft 2 Pharmacies (Picks 7-8)
  const availablePharmacies = await db.select()
    .from(pharmacies)
    .limit(2);
  
  console.log("\nDrafting 2 Pharmacies:");
  for (let i = 0; i < 2; i++) {
    const pharmacy = availablePharmacies[i];
    const pick = 7 + i;
    await db.insert(rosters).values({
      teamId,
      assetType: "pharmacy",
      assetId: pharmacy.id,
      draftRound: pick,
      draftPick: pick,
      acquisitionType: "draft"
    });
    console.log(`  Pick ${pick}: ${pharmacy.name} (ID: ${pharmacy.id})`);
  }
  
  // Draft 1 Flex (Pick 9) - choose a cannabis strain
  const flexStrain = await db.select()
    .from(cannabisStrains)
    .where(notInArray(cannabisStrains.id, draftedStrainIds))
    .limit(1);
  
  console.log("\nDrafting 1 Flex (Cannabis Strain):");
  if (flexStrain.length > 0) {
    await db.insert(rosters).values({
      teamId,
      assetType: "cannabisStrain",
      assetId: flexStrain[0].id,
      draftRound: 9,
      draftPick: 9,
      acquisitionType: "draft"
    });
    console.log(`  Pick 9: ${flexStrain[0].name} (ID: ${flexStrain[0].id})`);
  }
  
  // Verify final roster
  const finalRoster = await db.select().from(rosters).where(eq(rosters.teamId, teamId));
  console.log(`\n=== Draft Complete! ===`);
  console.log(`Final roster size: ${finalRoster.length}/9 players`);
  
  const rosterByType = {
    manufacturer: finalRoster.filter(r => r.assetType === "manufacturer").length,
    cannabisStrain: finalRoster.filter(r => r.assetType === "cannabisStrain").length,
    product: finalRoster.filter(r => r.assetType === "product").length,
    pharmacy: finalRoster.filter(r => r.assetType === "pharmacy").length
  };
  
  console.log("\nRoster breakdown:");
  console.log(`  Manufacturers: ${rosterByType.manufacturer}/2`);
  console.log(`  Cannabis Strains: ${rosterByType.cannabisStrain}/3 (2 + 1 flex)`);
  console.log(`  Products: ${rosterByType.product}/2`);
  console.log(`  Pharmacies: ${rosterByType.pharmacy}/2`);
  
  process.exit(0);
}

completeDraft().catch(console.error);
