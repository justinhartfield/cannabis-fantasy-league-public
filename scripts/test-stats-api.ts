import dotenv from 'dotenv';
dotenv.config({ path: ".env.local" });
dotenv.config();

import { statsRouter } from '../server/statsRouter';

async function testDirectly() {
    console.log('Testing statsRouter directly...');

    // Create a caller with a mock context
    const caller = statsRouter.createCaller({
        req: {} as any,
        res: {} as any,
        user: null,
    });

    console.log('Testing getAllEntities(manufacturer)...');
    const manufacturers = await caller.getAllEntities({ type: 'manufacturer' });
    console.log(`Found ${manufacturers.length} manufacturers`);

    if (manufacturers.length > 0) {
        const mfg = manufacturers[0];
        console.log(`Fetching history for ${mfg.name}...`);
        const history = await caller.getManufacturerHistory({ manufacturerId: mfg.id, days: 5 });
        console.log(`Found ${history.length} history entries`);
        console.log(history);
    } else {
        console.log('No manufacturers found. Database might be empty.');
    }

    console.log('\nTesting getAllEntities(product)...');
    const products = await caller.getAllEntities({ type: 'product' });
    console.log(`Found ${products.length} products`);

    if (products.length > 0) {
        const prod = products[0];
        console.log(`Fetching history for ${prod.name}...`);
        const history = await caller.getProductHistory({ productId: prod.id, days: 5 });
        console.log(`Found ${history.length} history entries`);
        console.log(history);
    }

    process.exit(0);
}

testDirectly().catch(console.error);
