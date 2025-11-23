
import { calculateManufacturerPoints, calculateStrainPoints } from './scoringEngine';

function testManufacturerScoring() {
    console.log('--- Testing Manufacturer Scoring ---');

    const cases = [
        {
            name: 'High Volume, High Growth (Dominant)',
            stats: {
                salesVolumeGrams: 5000, // 50 pts
                growthRatePercent: 15,
                marketShareRank: 1, // 50 pts bonus
                rankChange: 0,
                productCount: 10, // 10 pts
                orderCount: 20, // 40 pts
                marketSharePercent: 25.5, // 255 pts
                streakDays: 21, // 25 pts bonus
                previousSalesVolumeGrams: 4000, // Trend: 1.25 * 20 = 25 pts
            },
        },
        {
            name: 'Low Volume, New Entrant',
            stats: {
                salesVolumeGrams: 200, // 2 pts
                growthRatePercent: 100,
                marketShareRank: 50,
                rankChange: 10, // 40 pts bonus (capped)
                productCount: 2, // 2 pts
                orderCount: 5, // 10 pts
                marketSharePercent: 0.5, // 5 pts
                streakDays: 0,
                previousSalesVolumeGrams: 0, // New entrant bonus: 20 pts
            },
        },
        {
            name: 'Slumping Giant',
            stats: {
                salesVolumeGrams: 4000, // 40 pts
                growthRatePercent: -10,
                marketShareRank: 2, // 25 pts bonus
                rankChange: -5, // -15 pts penalty
                productCount: 15, // 15 pts
                orderCount: 15, // 30 pts
                marketSharePercent: 15.0, // 150 pts
                streakDays: 0,
                previousSalesVolumeGrams: 4500, // Trend: 0.88 * 20 = 17 pts
            },
        },
    ];

    cases.forEach((c) => {
        const result = calculateManufacturerPoints(c.stats);
        console.log(`\nCase: ${c.name}`);
        console.log(`Total Points: ${result.points}`);
        console.log('Breakdown:');
        result.breakdown.components.forEach((comp: any) => {
            console.log(`  - ${comp.category}: ${comp.value} (${comp.formula}) = ${comp.points}`);
        });
        result.breakdown.bonuses.forEach((bonus: any) => {
            console.log(`  + BONUS: ${bonus.type} (${bonus.condition}) = ${bonus.points}`);
        });
        result.breakdown.penalties.forEach((penalty: any) => {
            console.log(`  - PENALTY: ${penalty.type} (${penalty.condition}) = ${penalty.points}`);
        });
    });
}

function testProductScoring() {
    console.log('\n--- Testing Product (Strain) Scoring ---');

    const cases = [
        {
            name: 'Best Seller',
            stats: {
                favoriteCount: 100,
                favoriteGrowth: 10, // 20 pts
                pharmacyCount: 50,
                pharmacyExpansion: 5, // 25 pts
                avgPriceCents: 1000,
                priceStability: 95, // 10 pts bonus
                orderVolumeGrams: 1000, // 5 pts
                orderCount: 50, // 250 pts
                isTrending: true, // 20 pts bonus
                priceCategory: 'average',
                previousOrderVolumeGrams: 800, // Trend: 1.25 * 15 = 18 pts
            },
        },
        {
            name: 'Stable Staple',
            stats: {
                favoriteCount: 500,
                favoriteGrowth: 2, // 4 pts
                pharmacyCount: 100,
                pharmacyExpansion: 0,
                avgPriceCents: 800,
                priceStability: 99, // 10 pts bonus
                orderVolumeGrams: 500, // 2 pts
                orderCount: 20, // 100 pts
                isTrending: false,
                priceCategory: 'average',
                previousOrderVolumeGrams: 500, // Trend: 1.0 * 15 = 15 pts
            },
        },
    ];

    cases.forEach((c) => {
        const result = calculateStrainPoints(c.stats);
        console.log(`\nCase: ${c.name}`);
        console.log(`Total Points: ${result.points}`);
        console.log('Breakdown:');
        result.breakdown.components.forEach((comp: any) => {
            console.log(`  - ${comp.category}: ${comp.value} (${comp.formula}) = ${comp.points}`);
        });
        result.breakdown.bonuses.forEach((bonus: any) => {
            console.log(`  + BONUS: ${bonus.type} (${bonus.condition}) = ${bonus.points}`);
        });
        result.breakdown.penalties.forEach((penalty: any) => {
            console.log(`  - PENALTY: ${penalty.type} (${penalty.condition}) = ${penalty.points}`);
        });
    });
}

testManufacturerScoring();
testProductScoring();
