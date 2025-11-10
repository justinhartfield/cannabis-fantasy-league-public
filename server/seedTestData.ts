/**
 * Test Data Seeder
 * 
 * Seeds the database with test data for development and testing.
 */

import { getDb } from './db';
import { 
  manufacturers, 
  cannabisStrains, 
  products,
  pharmacies,
} from '../drizzle/schema';
import { getCannabisStrainStatsCalculator } from './cannabisStrainStatsCalculator';

async function seedTestData() {
  console.log('[Seed] Starting test data seeding...');
  
  // Ensure DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  // 1. Seed Manufacturers
  console.log('[Seed] Seeding manufacturers...');
  const manufacturerData = [
    { name: 'Aurora', productCount: 15, currentRank: 1, weeklyRank: 1, monthlyRank: 1, quarterlyRank: 1 },
    { name: 'Tilray', productCount: 12, currentRank: 2, weeklyRank: 2, monthlyRank: 2, quarterlyRank: 2 },
    { name: 'Canopy Growth', productCount: 10, currentRank: 3, weeklyRank: 3, monthlyRank: 3, quarterlyRank: 3 },
    { name: 'Bedrocan', productCount: 8, currentRank: 4, weeklyRank: 4, monthlyRank: 4, quarterlyRank: 4 },
    { name: 'Aphria', productCount: 6, currentRank: 5, weeklyRank: 5, monthlyRank: 5, quarterlyRank: 5 },
  ];

  const insertedManufacturers = [];
  for (const mfg of manufacturerData) {
    const result = await db.insert(manufacturers).values(mfg);
    insertedManufacturers.push({ id: Number(result[0].insertId), ...mfg });
  }
  console.log(`[Seed] Seeded ${insertedManufacturers.length} manufacturers`);

  // 2. Seed Cannabis Strains
  console.log('[Seed] Seeding cannabis strains...');
  const cannabisStrainData = [
    { 
      name: 'Gelato', 
      slug: 'gelato',
      type: 'hybrid' as const,
      description: 'A popular hybrid strain known for its sweet flavor',
      thcMin: 20,
      thcMax: 25,
      cbdMin: 0,
      cbdMax: 1,
    },
    { 
      name: 'OG Kush', 
      slug: 'og-kush',
      type: 'hybrid' as const,
      description: 'Classic strain with earthy and pine flavors',
      thcMin: 19,
      thcMax: 24,
      cbdMin: 0,
      cbdMax: 1,
    },
    { 
      name: 'Blue Dream', 
      slug: 'blue-dream',
      type: 'sativa' as const,
      description: 'Sativa-dominant hybrid with berry aroma',
      thcMin: 17,
      thcMax: 24,
      cbdMin: 0,
      cbdMax: 2,
    },
    { 
      name: 'Northern Lights', 
      slug: 'northern-lights',
      type: 'indica' as const,
      description: 'Pure indica strain, very relaxing',
      thcMin: 16,
      thcMax: 21,
      cbdMin: 0,
      cbdMax: 1,
    },
    { 
      name: 'Sour Diesel', 
      slug: 'sour-diesel',
      type: 'sativa' as const,
      description: 'Energizing sativa with diesel aroma',
      thcMin: 20,
      thcMax: 25,
      cbdMin: 0,
      cbdMax: 1,
    },
  ];

  const insertedStrains = [];
  for (const strain of cannabisStrainData) {
    const result = await db.insert(cannabisStrains).values(strain);
    insertedStrains.push({ id: Number(result[0].insertId), ...strain });
  }
  console.log(`[Seed] Seeded ${insertedStrains.length} cannabis strains`);

  // 3. Seed Products (multiple products per strain)
  console.log('[Seed] Seeding products...');
  const productData = [];
  
  // Create 2-3 products for each cannabis strain from different manufacturers
  for (const strain of insertedStrains) {
    const numProducts = Math.floor(Math.random() * 2) + 2; // 2-3 products per strain
    
    for (let i = 0; i < numProducts; i++) {
      const manufacturer = insertedManufacturers[i % insertedManufacturers.length];
      const favoriteCount = Math.floor(Math.random() * 500) + 100; // 100-600 favorites
      const pharmacyCount = Math.floor(Math.random() * 50) + 10; // 10-60 pharmacies
      const avgPriceCents = Math.floor(Math.random() * 5000) + 5000; // €50-€100
      
      productData.push({
        name: `${strain.name} - ${manufacturer.name}`,
        strainId: strain.id,
        strainName: strain.name,
        manufacturerId: manufacturer.id,
        manufacturerName: manufacturer.name,
        favoriteCount,
        pharmacyCount,
        avgPriceCents,
        minPriceCents: avgPriceCents - 500,
        maxPriceCents: avgPriceCents + 500,
        thcContent: `${strain.thcMin}-${strain.thcMax}%`,
        cbdContent: `${strain.cbdMin}-${strain.cbdMax}%`,
        genetics: strain.type,
      });
    }
  }

  for (const product of productData) {
    await db.insert(products).values(product);
  }
  console.log(`[Seed] Seeded ${productData.length} products`);

  // 4. Seed Pharmacies
  console.log('[Seed] Seeding pharmacies...');
  const pharmacyData = [
    { 
      name: 'Apotheke am Markt', 
      city: 'Berlin', 
      state: 'Berlin',
      productCount: 150,
      weeklyRevenueCents: 50000,
      weeklyOrderCount: 200,
      avgOrderSizeGrams: 10,
      customerRetentionRate: 85,
      appUsageRate: 60,
    },
    { 
      name: 'Cannabis Apotheke München', 
      city: 'München', 
      state: 'Bayern',
      productCount: 120,
      weeklyRevenueCents: 45000,
      weeklyOrderCount: 180,
      avgOrderSizeGrams: 12,
      customerRetentionRate: 80,
      appUsageRate: 55,
    },
    { 
      name: 'Grüne Apotheke Hamburg', 
      city: 'Hamburg', 
      state: 'Hamburg',
      productCount: 100,
      weeklyRevenueCents: 40000,
      weeklyOrderCount: 160,
      avgOrderSizeGrams: 8,
      customerRetentionRate: 75,
      appUsageRate: 50,
    },
  ];

  for (const pharmacy of pharmacyData) {
    await db.insert(pharmacies).values(pharmacy);
  }
  console.log(`[Seed] Seeded ${pharmacyData.length} pharmacies`);

  // 5. Calculate cannabis strain weekly stats for current week
  console.log('[Seed] Calculating cannabis strain weekly stats...');
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  
  const calculator = getCannabisStrainStatsCalculator();
  await calculator.calculateWeeklyStats(year, week);
  
  console.log('[Seed] Test data seeding complete!');
  console.log(`[Seed] Summary:`);
  console.log(`  - ${insertedManufacturers.length} manufacturers`);
  console.log(`  - ${insertedStrains.length} cannabis strains`);
  console.log(`  - ${productData.length} products`);
  console.log(`  - ${pharmacyData.length} pharmacies`);
  console.log(`  - Cannabis strain stats calculated for ${year}-W${week}`);
}

// Run seeder
seedTestData()
  .then(() => {
    console.log('[Seed] Success!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Seed] Error:', error);
    process.exit(1);
  });
