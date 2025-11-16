import { getDb } from '../server/db';
import { manufacturers, cannabisStrains, pharmacies, manufacturerDailyStats, cannabisStrainDailyStats, pharmacyDailyStats } from '../drizzle/schema';
import { MetabaseClient } from '../server/lib/metabase-client-v2';
import { eq } from 'drizzle-orm';

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
    const [manufacturerStats, strainStats, pharmacyStats] = await Promise.all([
      MetabaseClient.getManufacturerStatsToday(),
      MetabaseClient.getStrainStatsToday(),
      MetabaseClient.getPharmacyStatsToday(),
    ]);

    console.log(`✅ Fetched ${manufacturerStats.length} manufacturers`);
    console.log(`✅ Fetched ${strainStats.length} strains`);
    console.log(`✅ Fetched ${pharmacyStats.length} pharmacies\n`);

    // Sync manufacturers
    console.log('🏭 Syncing manufacturers...');
    let manufacturerCount = 0;
    for (const stat of manufacturerStats) {
      // Find manufacturer by name
      const [manufacturer] = await db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.name, stat.name))
        .limit(1);

      if (!manufacturer) {
        console.log(`⚠️  Manufacturer not found: ${stat.name}`);
        continue;
      }

      // Upsert daily stats
      await db
        .insert(manufacturerDailyStats)
        .values({
          manufacturerId: manufacturer.id,
          statDate: dateStr,
          salesVolumeGrams: stat.salesVolumeGrams,
          orderCount: stat.orderCount,
          revenueCents: stat.revenueCents,
        })
        .onConflictDoUpdate({
          target: [manufacturerDailyStats.manufacturerId, manufacturerDailyStats.statDate],
          set: {
            salesVolumeGrams: stat.salesVolumeGrams,
            orderCount: stat.orderCount,
            revenueCents: stat.revenueCents,
          },
        });

      manufacturerCount++;
      console.log(`   ✓ ${stat.name}: ${stat.salesVolumeGrams}g, ${stat.orderCount} orders, €${(stat.revenueCents / 100).toFixed(2)}`);
    }
    console.log(`✅ Synced ${manufacturerCount} manufacturers\n`);

    // Sync strains
    console.log('🌿 Syncing strains...');
    let strainCount = 0;
    for (const stat of strainStats) {
      // Find strain by name
      const [strain] = await db
        .select()
        .from(cannabisStrains)
        .where(eq(cannabisStrains.name, stat.name))
        .limit(1);

      if (!strain) {
        console.log(`⚠️  Strain not found: ${stat.name}`);
        continue;
      }

      // Upsert daily stats
      await db
        .insert(cannabisStrainDailyStats)
        .values({
          strainId: strain.id,
          statDate: dateStr,
          salesVolumeGrams: stat.salesVolumeGrams,
          orderCount: stat.orderCount,
        })
        .onConflictDoUpdate({
          target: [cannabisStrainDailyStats.strainId, cannabisStrainDailyStats.statDate],
          set: {
            salesVolumeGrams: stat.salesVolumeGrams,
            orderCount: stat.orderCount,
          },
        });

      strainCount++;
      console.log(`   ✓ ${stat.name}: ${stat.salesVolumeGrams}g, ${stat.orderCount} orders`);
    }
    console.log(`✅ Synced ${strainCount} strains\n`);

    // Sync pharmacies
    console.log('💊 Syncing pharmacies...');
    let pharmacyCount = 0;
    for (const stat of pharmacyStats) {
      // Find pharmacy by name
      const [pharmacy] = await db
        .select()
        .from(pharmacies)
        .where(eq(pharmacies.name, stat.name))
        .limit(1);

      if (!pharmacy) {
        console.log(`⚠️  Pharmacy not found: ${stat.name}`);
        continue;
      }

      // Upsert daily stats
      await db
        .insert(pharmacyDailyStats)
        .values({
          pharmacyId: pharmacy.id,
          statDate: dateStr,
          orderCount: stat.orderCount,
          revenueCents: stat.revenueCents,
        })
        .onConflictDoUpdate({
          target: [pharmacyDailyStats.pharmacyId, pharmacyDailyStats.statDate],
          set: {
            orderCount: stat.orderCount,
            revenueCents: stat.revenueCents,
          },
        });

      pharmacyCount++;
      console.log(`   ✓ ${stat.name}: ${stat.orderCount} orders, €${(stat.revenueCents / 100).toFixed(2)}`);
    }
    console.log(`✅ Synced ${pharmacyCount} pharmacies\n`);

    console.log('🎉 Daily stats sync complete!');
    console.log(`📊 Summary:`);
    console.log(`   - ${manufacturerCount} manufacturers`);
    console.log(`   - ${strainCount} strains`);
    console.log(`   - ${pharmacyCount} pharmacies`);

  } catch (error) {
    console.error('❌ Error syncing daily stats:', error);
    throw error;
  }
}

// Run sync for today
const today = new Date();
syncDailyStats(today)
  .then(() => {
    console.log('\n✅ Sync completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Sync failed:', error);
    process.exit(1);
  });
