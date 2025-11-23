import { getDb } from '../server/db';
import { 
  manufacturers, 
  brands,
  cannabisStrains,
  pharmacies,
  manufacturerDailyStats,
  brandDailyStats,
  cannabisStrainDailyStats,
  pharmacyDailyStats
} from '../drizzle/schema';
import { MetabaseClient } from '../server/lib/metabase-client-v2';
import { eq } from 'drizzle-orm';
import { isBrandMigrationName } from '../shared/brandMigration';

// Scoring formula: (salesVolumeGrams / 10) rounded
function calculatePoints(salesVolumeGrams: number): number {
  return Math.round(salesVolumeGrams / 10);
}

async function syncDailyStats(date: Date) {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }
  
  console.log(`\n🔄 Syncing daily stats for ${date.toISOString().split('T')[0]}...\n`);

  const dateStr = date.toISOString().split('T')[0];

  try {
    // Fetch data from Metabase
    console.log('📊 Fetching data from Metabase...');
    const [manufacturerStats, productStats, strainStats, pharmacyStats] = await Promise.all([
      MetabaseClient.getManufacturerStatsToday(),
      MetabaseClient.getProductStatsToday(),
      MetabaseClient.getStrainStatsToday(),
      MetabaseClient.getPharmacyStatsToday(),
    ]);

    console.log(`✅ Fetched ${manufacturerStats.length} manufacturers`);
    console.log(`✅ Fetched ${productStats.length} products (brands)`);
    console.log(`✅ Fetched ${strainStats.length} strains`);
    console.log(`✅ Fetched ${pharmacyStats.length} pharmacies\n`);

    // Sync manufacturers
    console.log('🏭 Syncing manufacturers...');
    let manufacturerCount = 0;
    for (const stat of manufacturerStats) {
      if (isBrandMigrationName(stat.name)) {
        console.log(`ℹ️  Skipping ${stat.name} (tracked as brand)`);
        continue;
      }
      const [manufacturer] = await db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.name, stat.name))
        .limit(1);

      if (!manufacturer) {
        console.log(`⚠️  Manufacturer not found: ${stat.name}`);
        continue;
      }

      const points = calculatePoints(stat.salesVolumeGrams);

      await db
        .insert(manufacturerDailyStats)
        .values({
          manufacturerId: manufacturer.id,
          statDate: dateStr,
          salesVolumeGrams: stat.salesVolumeGrams,
          totalPoints: points,
        })
        .onConflictDoUpdate({
          target: [manufacturerDailyStats.manufacturerId, manufacturerDailyStats.statDate],
          set: {
            salesVolumeGrams: stat.salesVolumeGrams,
            totalPoints: points,
            updatedAt: new Date().toISOString(),
          },
        });

      manufacturerCount++;
      console.log(`   ✓ ${stat.name}: ${stat.salesVolumeGrams}g = ${points} pts`);
    }
    console.log(`✅ Synced ${manufacturerCount} manufacturers\n`);

    // Sync products as brands
    console.log('📦 Syncing products (brands)...');
    let brandCount = 0;
    for (const stat of productStats) {
      const [brand] = await db
        .select()
        .from(brands)
        .where(eq(brands.name, stat.name))
        .limit(1);

      if (!brand) {
        console.log(`⚠️  Brand not found: ${stat.name}`);
        continue;
      }

      const points = calculatePoints(stat.salesVolumeGrams);

      await db
        .insert(brandDailyStats)
        .values({
          brandId: brand.id,
          statDate: dateStr,
          salesVolumeGrams: stat.salesVolumeGrams,
          totalPoints: points,
        })
        .onConflictDoUpdate({
          target: [brandDailyStats.brandId, brandDailyStats.statDate],
          set: {
            salesVolumeGrams: stat.salesVolumeGrams,
            totalPoints: points,
            updatedAt: new Date().toISOString(),
          },
        });

      brandCount++;
      console.log(`   ✓ ${stat.name}: ${stat.salesVolumeGrams}g = ${points} pts`);
    }
    console.log(`✅ Synced ${brandCount} brands\n`);

    // Sync strains
    console.log('🌿 Syncing strains...');
    let strainCount = 0;
    for (const stat of strainStats) {
      const [strain] = await db
        .select()
        .from(cannabisStrains)
        .where(eq(cannabisStrains.name, stat.name))
        .limit(1);

      if (!strain) {
        console.log(`⚠️  Strain not found: ${stat.name}`);
        continue;
      }

      const points = calculatePoints(stat.salesVolumeGrams);

      await db
        .insert(cannabisStrainDailyStats)
        .values({
          cannabisStrainId: strain.id,
          statDate: dateStr,
          salesVolumeGrams: stat.salesVolumeGrams,
          totalPoints: points,
        })
        .onConflictDoUpdate({
          target: [cannabisStrainDailyStats.cannabisStrainId, cannabisStrainDailyStats.statDate],
          set: {
            salesVolumeGrams: stat.salesVolumeGrams,
            totalPoints: points,
            updatedAt: new Date().toISOString(),
          },
        });

      strainCount++;
      console.log(`   ✓ ${stat.name}: ${stat.salesVolumeGrams}g = ${points} pts`);
    }
    console.log(`✅ Synced ${strainCount} strains\n`);

    // Sync pharmacies
    console.log('💊 Syncing pharmacies...');
    let pharmacyCount = 0;
    for (const stat of pharmacyStats) {
      const [pharmacy] = await db
        .select()
        .from(pharmacies)
        .where(eq(pharmacies.name, stat.name))
        .limit(1);

      if (!pharmacy) {
        console.log(`⚠️  Pharmacy not found: ${stat.name}`);
        continue;
      }

      // Pharmacies might use order count for points
      const points = stat.orderCount * 5; // Example: 5 points per order

      await db
        .insert(pharmacyDailyStats)
        .values({
          pharmacyId: pharmacy.id,
          statDate: dateStr,
          totalPoints: points,
        })
        .onConflictDoUpdate({
          target: [pharmacyDailyStats.pharmacyId, pharmacyDailyStats.statDate],
          set: {
            totalPoints: points,
            updatedAt: new Date().toISOString(),
          },
        });

      pharmacyCount++;
      console.log(`   ✓ ${stat.name}: ${stat.orderCount} orders = ${points} pts`);
    }
    console.log(`✅ Synced ${pharmacyCount} pharmacies\n`);

    console.log('🎉 Daily stats sync complete!');
    console.log(`📊 Summary:`);
    console.log(`   - ${manufacturerCount} manufacturers`);
    console.log(`   - ${brandCount} brands`);
    console.log(`   - ${strainCount} strains`);
    console.log(`   - ${pharmacyCount} pharmacies`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error syncing daily stats:', error);
    process.exit(1);
  }
}

// Run sync for today
const today = new Date();
syncDailyStats(today);
