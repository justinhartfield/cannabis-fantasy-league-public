/**
 * Metabase Data Sync Script
 * 
 * Imports manufacturers, strains, products, and pharmacies from weed.de Metabase
 * into the PostgreSQL database for the Cannabis Fantasy League.
 */

import { getMetabaseClient } from '../server/lib/metabase';
import { getDb } from '../server/db';
import { manufacturers, cannabisStrains, strains, pharmacies } from '../drizzle/schema';

async function syncData() {
  console.log('🚀 Starting Metabase data sync...\n');

  const metabase = getMetabaseClient();
  const db = await getDb();

  if (!db) {
    console.error('❌ Database connection failed');
    process.exit(1);
  }

  try {
    // 1. Sync Manufacturers (Brands)
    console.log('📦 Syncing manufacturers...');
    const manufacturerData = await metabase.fetchManufacturers();
    
    for (const mfg of manufacturerData) {
      await db.insert(manufacturers).values({
        name: mfg.name,
        currentRank: mfg.rank_1d,
        weeklyRank: mfg.rank_7d,
        monthlyRank: mfg.rank_30d,
        quarterlyRank: mfg.rank_90d,
        productCount: mfg.product_count,
      }).onConflictDoNothing();
    }
    console.log(`✅ Synced ${manufacturerData.length} manufacturers\n`);

    // 2. Sync Cannabis Strains (Genetics/Cultivars)
    console.log('🌿 Syncing cannabis strains...');
    const cannabisStrainData = await metabase.fetchCannabisStrains();
    
    for (const strain of cannabisStrainData) {
      await db.insert(cannabisStrains).values({
        metabaseId: strain.metabaseId,
        name: strain.name,
        slug: strain.slug,
        type: strain.type,
        description: strain.description,
        effects: strain.effects,
        flavors: strain.flavors,
        terpenes: strain.terpenes,
        thcMin: strain.thcMin,
        thcMax: strain.thcMax,
        cbdMin: strain.cbdMin,
        cbdMax: strain.cbdMax,
      }).onConflictDoNothing();
    }
    console.log(`✅ Synced ${cannabisStrainData.length} cannabis strains\n`);

    // 3. Sync Strains (Products)
    console.log('💊 Syncing product strains...');
    const strainData = await metabase.fetchStrains();
    
    for (const strain of strainData) {
      await db.insert(strains).values({
        name: strain.name,
        manufacturerName: strain.manufacturer,
        favoriteCount: strain.favorite_count,
        pharmacyCount: strain.pharmacy_count,
        avgPriceCents: Math.round(strain.avg_price * 100),
        minPriceCents: Math.round(strain.min_price * 100),
        maxPriceCents: Math.round(strain.max_price * 100),
        priceCategory: strain.price_category,
        thcContent: strain.thc_content,
        cbdContent: strain.cbd_content,
      }).onConflictDoNothing();
    }
    console.log(`✅ Synced ${strainData.length} product strains\n`);

    // 4. Sync Pharmacies
    console.log('🏥 Syncing pharmacies...');
    const pharmacyData = await metabase.fetchPharmacies();
    
    for (const pharmacy of pharmacyData) {
      await db.insert(pharmacies).values({
        name: pharmacy.name,
        city: pharmacy.city,
        state: pharmacy.state,
        productCount: pharmacy.product_count,
        weeklyRevenueCents: Math.round(pharmacy.weekly_revenue * 100),
        weeklyOrderCount: pharmacy.weekly_orders,
        avgOrderSizeGrams: Math.round(pharmacy.avg_order_size),
        customerRetentionRate: Math.round(pharmacy.retention_rate * 100),
        appUsageRate: Math.round(pharmacy.app_usage_rate * 100),
      }).onConflictDoNothing();
    }
    console.log(`✅ Synced ${pharmacyData.length} pharmacies\n`);

    console.log('🎉 Data sync complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncData();
