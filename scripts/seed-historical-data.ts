
import dotenv from 'dotenv';
dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from '../server/db';
import {
    manufacturerDailyStats,
    productDailyChallengeStats,
    strainDailyChallengeStats,
    pharmacyDailyChallengeStats,
    brandDailyChallengeStats,
    manufacturers,
    strains,
    cannabisStrains,
    pharmacies,
    brands
} from '../drizzle/schema';
import { subDays, format } from 'date-fns';

async function seedHistoricalData() {
    const db = await getDb();
    if (!db) {
        console.error('Database not available');
        process.exit(1);
    }

    console.log('Seeding historical data...');

    // 1. Ensure we have at least one entity of each type
    let mfgId = 1;
    let prodId = 1;
    let strainId = 1;
    let pharmacyId = 1;
    let brandId = 1;

    // Check/Create Manufacturer
    const mfg = await db.select().from(manufacturers).limit(1);
    if (mfg.length === 0) {
        const res = await db.insert(manufacturers).values({
            name: 'Test Manufacturer',
            productCount: 10
        }).returning();
        mfgId = res[0].id;
        console.log('Created test manufacturer');
    } else {
        mfgId = mfg[0].id;
    }

    // Check/Create Product (Strain table used for products in some contexts, but let's assume we need a strain entry)
    // Actually, productDailyChallengeStats links to strains table (aliased as products in some queries, but schema says productId references strains.id)
    const prod = await db.select().from(strains).limit(1);
    if (prod.length === 0) {
        const res = await db.insert(strains).values({
            name: 'Test Product',
            avgPriceCents: 1000,
            minPriceCents: 900,
            maxPriceCents: 1100,
            manufacturerId: mfgId
        }).returning();
        prodId = res[0].id;
        console.log('Created test product');
    } else {
        prodId = prod[0].id;
    }

    // Check/Create Cannabis Strain
    const cs = await db.select().from(cannabisStrains).limit(1);
    if (cs.length === 0) {
        const res = await db.insert(cannabisStrains).values({
            name: 'Test Strain',
            metabaseId: 'test-strain-1'
        }).returning();
        strainId = res[0].id;
        console.log('Created test cannabis strain');
    } else {
        strainId = cs[0].id;
    }

    // Check/Create Pharmacy
    const ph = await db.select().from(pharmacies).limit(1);
    if (ph.length === 0) {
        const res = await db.insert(pharmacies).values({
            name: 'Test Pharmacy',
        }).returning();
        pharmacyId = res[0].id;
        console.log('Created test pharmacy');
    } else {
        pharmacyId = ph[0].id;
    }

    // Check/Create Brand
    const br = await db.select().from(brands).limit(1);
    if (br.length === 0) {
        const res = await db.insert(brands).values({
            name: 'Test Brand',
        }).returning();
        brandId = res[0].id;
        console.log('Created test brand');
    } else {
        brandId = br[0].id;
    }

    // 2. Insert daily stats for the last 30 days
    const days = 30;
    for (let i = 0; i < days; i++) {
        const date = subDays(new Date(), i);
        const dateString = format(date, 'yyyy-MM-dd');

        // Manufacturer Stats
        await db.insert(manufacturerDailyStats).values({
            manufacturerId: mfgId,
            statDate: dateString,
            salesVolumeGrams: 1000 + Math.floor(Math.random() * 500),
            productCount: 10,
            totalPoints: 50 + Math.floor(Math.random() * 50)
        }).onConflictDoNothing();

        // Product Stats
        await db.insert(productDailyChallengeStats).values({
            productId: prodId,
            statDate: dateString,
            salesVolumeGrams: 100 + Math.floor(Math.random() * 50),
            orderCount: 20 + Math.floor(Math.random() * 10),
            totalPoints: 10 + Math.floor(Math.random() * 10),
            trendMultiplier: (1.0 + Math.random() * 0.5).toFixed(2)
        }).onConflictDoNothing();

        // Strain Stats
        await db.insert(strainDailyChallengeStats).values({
            strainId: strainId,
            statDate: dateString,
            salesVolumeGrams: 500 + Math.floor(Math.random() * 200),
            orderCount: 50 + Math.floor(Math.random() * 20),
            totalPoints: 30 + Math.floor(Math.random() * 20)
        }).onConflictDoNothing();

        // Pharmacy Stats
        await db.insert(pharmacyDailyChallengeStats).values({
            pharmacyId: pharmacyId,
            statDate: dateString,
            revenueCents: 50000 + Math.floor(Math.random() * 10000),
            orderCount: 15 + Math.floor(Math.random() * 10),
            totalPoints: 25 + Math.floor(Math.random() * 15)
        }).onConflictDoNothing();

        // Brand Stats
        await db.insert(brandDailyChallengeStats).values({
            brandId: brandId,
            statDate: dateString,
            totalRatings: 5 + Math.floor(Math.random() * 5),
            averageRating: (4.0 + Math.random()).toFixed(2),
            totalPoints: 15 + Math.floor(Math.random() * 10)
        }).onConflictDoNothing();
    }

    console.log('Seeding complete!');
    process.exit(0);
}

seedHistoricalData().catch(console.error);
