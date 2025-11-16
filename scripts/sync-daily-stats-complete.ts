import axios from 'axios';
import { getDb } from '../server/db';
import { 
  manufacturers, brands, cannabisStrains, pharmacies, products,
  manufacturerDailyStats, brandDailyStats, cannabisStrainDailyStats, 
  pharmacyDailyStats, productDailyStats
} from '../drizzle/schema';
import { eq } from 'drizzle-orm';

const METABASE_URL = 'https://bi.weed.de';
const METABASE_API_KEY = process.env.METABASE_API_KEY || 'mb_v2XR/W+F1+svoeobEorso52tVPk0qeNOHkjgtcNLqTU=';

// Card IDs
const CARDS = {
  manufacturers: 1273, // Top Manufacturers Today
  brands: 1278,        // Brand indv today
  strains: 1275,       // Top Strains Sold Today
  pharmacies: 1276,    // Top Pharmacies Today
  products: 1269,      // Top Products Today
};

interface MetabaseRow {
  name: string;
  grams: number;
  orders?: number;
  revenue?: number;
}

async function queryCard(cardId: number): Promise<MetabaseRow[]> {
  try {
    const response = await axios.post(
      `${METABASE_URL}/api/card/${cardId}/query`,
      {},
      { headers: { 'X-API-KEY': METABASE_API_KEY } }
    );
    
    return response.data.data.rows.map((row: any) => ({
      name: row[0],
      grams: Math.round(row[1] || 0),
      orders: row[3] || 0,
      revenue: row[2] ? Math.round(row[2] * 100) : 0, // Convert to cents
    }));
  } catch (error) {
    console.error(`Error querying card ${cardId}:`, error);
    return [];
  }
}

async function syncManufacturers(db: any, date: string, data: MetabaseRow[]) {
  console.log(`\n=== Syncing ${data.length} manufacturers ===`);
  let synced = 0;
  
  for (const stat of data) {
    try {
      const [mfg] = await db.select().from(manufacturers)
        .where(eq(manufacturers.name, stat.name)).limit(1);
      
      if (mfg) {
        await db.insert(manufacturerDailyStats).values({
          manufacturerId: mfg.id,
          statDate: date,
          salesVolumeGrams: stat.grams,
          totalPoints: Math.round(stat.grams / 10),
        }).onConflictDoUpdate({
          target: [manufacturerDailyStats.manufacturerId, manufacturerDailyStats.statDate],
          set: { 
            salesVolumeGrams: stat.grams, 
            totalPoints: Math.round(stat.grams / 10),
            updatedAt: new Date().toISOString(),
          }
        });
        synced++;
        console.log(`✓ ${stat.name}: ${stat.grams}g = ${Math.round(stat.grams/10)} pts`);
      } else {
        console.log(`✗ ${stat.name}: not found in database`);
      }
    } catch (error) {
      console.error(`Error syncing ${stat.name}:`, error);
    }
  }
  
  console.log(`Synced ${synced}/${data.length} manufacturers`);
}

async function syncBrands(db: any, date: string, data: MetabaseRow[]) {
  console.log(`\n=== Syncing ${data.length} brands ===`);
  let synced = 0;
  
  for (const stat of data) {
    try {
      const [brand] = await db.select().from(brands)
        .where(eq(brands.name, stat.name)).limit(1);
      
      if (brand) {
        await db.insert(brandDailyStats).values({
          brandId: brand.id,
          statDate: date,
          totalPoints: Math.round(stat.grams / 10),
        }).onConflictDoUpdate({
          target: [brandDailyStats.brandId, brandDailyStats.statDate],
          set: { 
            totalPoints: Math.round(stat.grams / 10),
            updatedAt: new Date().toISOString(),
          }
        });
        synced++;
        console.log(`✓ ${stat.name}: ${Math.round(stat.grams/10)} pts`);
      } else {
        console.log(`✗ ${stat.name}: not found in database`);
      }
    } catch (error) {
      console.error(`Error syncing ${stat.name}:`, error);
    }
  }
  
  console.log(`Synced ${synced}/${data.length} brands`);
}

async function syncStrains(db: any, date: string, data: MetabaseRow[]) {
  console.log(`\n=== Syncing ${data.length} strains ===`);
  let synced = 0;
  
  for (const stat of data) {
    try {
      const [strain] = await db.select().from(cannabisStrains)
        .where(eq(cannabisStrains.name, stat.name)).limit(1);
      
      if (strain) {
        await db.insert(cannabisStrainDailyStats).values({
          cannabisStrainId: strain.id,
          statDate: date,
          salesVolumeGrams: stat.grams,
          totalPoints: Math.round(stat.grams / 10),
        }).onConflictDoUpdate({
          target: [cannabisStrainDailyStats.cannabisStrainId, cannabisStrainDailyStats.statDate],
          set: { 
            salesVolumeGrams: stat.grams,
            totalPoints: Math.round(stat.grams / 10),
            updatedAt: new Date().toISOString(),
          }
        });
        synced++;
        console.log(`✓ ${stat.name}: ${stat.grams}g = ${Math.round(stat.grams/10)} pts`);
      } else {
        console.log(`✗ ${stat.name}: not found in database`);
      }
    } catch (error) {
      console.error(`Error syncing ${stat.name}:`, error);
    }
  }
  
  console.log(`Synced ${synced}/${data.length} strains`);
}

async function syncPharmacies(db: any, date: string, data: MetabaseRow[]) {
  console.log(`\n=== Syncing ${data.length} pharmacies ===`);
  let synced = 0;
  
  for (const stat of data) {
    try {
      const [pharmacy] = await db.select().from(pharmacies)
        .where(eq(pharmacies.name, stat.name)).limit(1);
      
      if (pharmacy) {
        await db.insert(pharmacyDailyStats).values({
          pharmacyId: pharmacy.id,
          statDate: date,
          orderCount: stat.orders || 0,
          revenueCents: stat.revenue || 0,
          totalPoints: Math.round((stat.orders || 0) * 5 + (stat.revenue || 0) / 100),
        }).onConflictDoUpdate({
          target: [pharmacyDailyStats.pharmacyId, pharmacyDailyStats.statDate],
          set: { 
            orderCount: stat.orders || 0,
            revenueCents: stat.revenue || 0,
            totalPoints: Math.round((stat.orders || 0) * 5 + (stat.revenue || 0) / 100),
            updatedAt: new Date().toISOString(),
          }
        });
        synced++;
        console.log(`✓ ${stat.name}: ${stat.orders} orders, €${((stat.revenue || 0)/100).toFixed(2)}`);
      } else {
        console.log(`✗ ${stat.name}: not found in database`);
      }
    } catch (error) {
      console.error(`Error syncing ${stat.name}:`, error);
    }
  }
  
  console.log(`Synced ${synced}/${data.length} pharmacies`);
}

async function syncProducts(db: any, date: string, data: MetabaseRow[]) {
  console.log(`\n=== Syncing ${data.length} products ===`);
  let synced = 0;
  let created = 0;
  
  for (const stat of data) {
    try {
      // Check if product exists
      let [product] = await db.select().from(products)
        .where(eq(products.name, stat.name)).limit(1);
      
      // If not, create it
      if (!product) {
        const [newProduct] = await db.insert(products).values({
          name: stat.name,
          slug: stat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        }).returning();
        product = newProduct;
        created++;
        console.log(`+ Created product: ${stat.name}`);
      }
      
      // Sync daily stats
      await db.insert(productDailyStats).values({
        productId: product.id,
        statDate: date,
        salesVolumeGrams: stat.grams,
        orderCount: stat.orders || 0,
        revenueCents: stat.revenue || 0,
        totalPoints: Math.round(stat.grams / 10),
      }).onConflictDoUpdate({
        target: [productDailyStats.productId, productDailyStats.statDate],
        set: { 
          salesVolumeGrams: stat.grams,
          orderCount: stat.orders || 0,
          revenueCents: stat.revenue || 0,
          totalPoints: Math.round(stat.grams / 10),
          updatedAt: new Date().toISOString(),
        }
      });
      synced++;
      console.log(`✓ ${stat.name}: ${stat.grams}g = ${Math.round(stat.grams/10)} pts`);
    } catch (error) {
      console.error(`Error syncing ${stat.name}:`, error);
    }
  }
  
  console.log(`Synced ${synced}/${data.length} products (${created} new)`);
}

async function main() {
  const date = process.argv[2] || new Date().toISOString().split('T')[0];
  console.log(`\n🔄 Syncing daily stats for ${date}...\n`);
  
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }
  
  try {
    // Fetch all data in parallel
    const [mfgData, brandData, strainData, pharmacyData, productData] = await Promise.all([
      queryCard(CARDS.manufacturers),
      queryCard(CARDS.brands),
      queryCard(CARDS.strains),
      queryCard(CARDS.pharmacies),
      queryCard(CARDS.products),
    ]);
    
    console.log(`Fetched: ${mfgData.length} manufacturers, ${brandData.length} brands, ${strainData.length} strains, ${pharmacyData.length} pharmacies, ${productData.length} products`);
    
    // Sync all entity types
    await syncManufacturers(db, date, mfgData);
    await syncBrands(db, date, brandData);
    await syncStrains(db, date, strainData);
    await syncPharmacies(db, date, pharmacyData);
    await syncProducts(db, date, productData);
    
    console.log(`\n✅ Sync complete for ${date}!\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

main();
