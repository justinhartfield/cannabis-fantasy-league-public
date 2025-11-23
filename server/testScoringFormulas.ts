
import { calculateManufacturerPoints, calculateStrainPoints } from './scoringEngine';

function testManufacturerScoring() {
    console.log('--- Testing Manufacturer Scoring (Daily-First Aggregation) ---');

    // Mock 7 days of stats
    const dailyStats = Array(7).fill(null).map((_, i) => ({
        statDate: `2024-01-0${i + 1}`,
        salesVolumeGrams: 1000,
        orderCount: 10, // 50 pts per day (10 * 5)
        revenueCents: 10000,
        rank: 1,
        previousRank: 1,
        trendMultiplier: 1.5, // 1.5 * 25 = 37 pts per day
        consistencyScore: 80, // 16 pts per day
        velocityScore: 10, // 1 pts per day
        streakDays: 21 + i, // > 21 days
        marketSharePercent: 20, // 20 pts per day
        totalPoints: 50 + 37 + 30 + 0 + 16 + 1 + 15 + 20, // ~169 pts per day
    }));

    // Calculate expected daily total
    // Note: The test uses the logic from trendScoringEngine implicitly via the totalPoints mock,
    // but calculateManufacturerPoints RE-CALCULATES it.
    // So we need to expect the sum of what calculateManufacturerTrendScore would output.
    // Order: 10 * 5 = 50
    // Trend: 1.5 * 25 = 37
    // Rank: #1 = 30
    // Momentum: 0
    // Consistency: 80 * 0.2 = 16
    // Velocity: 10 * 0.15 = 1
    // Streak: 15 (capped)
    // Market Share: 20 (capped)
    // Total Daily = 50 + 37 + 30 + 0 + 16 + 1 + 15 + 20 = 169

    const weeklyContext = {
        rankChange: 2, // +20 pts
        marketShareRank: 1, // +50 pts
        marketSharePercent: 20,
        streakDays: 27, // +25 pts
    };

    const result = calculateManufacturerPoints(dailyStats as any[], weeklyContext);

    console.log(`\nCase: Dominant Week`);
    console.log(`Total Points: ${result.points}`);
    console.log(`Expected Points: ${(169 * 7) + 25 + 50 + 20}`); // 1183 + 95 = 1278
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
}

function testProductScoring() {
    console.log('\n--- Testing Product (Strain) Scoring (Daily-First Aggregation) ---');

    // Mock 7 days of stats
    const dailyStats = Array(7).fill(null).map((_, i) => ({
        statDate: `2024-01-0${i + 1}`,
        orderCount: 5, // 5 * 5 = 25 pts
        rank: 5, // 15 pts
        previousRank: 5,
        trendMultiplier: 1.2, // 1.2 * 22 = 26 pts
        consistencyScore: 90, // 18 pts
        velocityScore: 0,
        streakDays: 14 + i, // 15 pts
        marketSharePercent: 5, // 10 pts
        totalPoints: 0, // Ignored, re-calculated
    }));

    // Expected Daily:
    // Order: 25
    // Trend: 26
    // Rank: 15
    // Consistency: 18
    // Streak: 15
    // Market Share: 10
    // Total = 109

    const weeklyContext = {
        isTrending: true, // +20 pts
        streakDays: 20, // +15 pts
        marketSharePercent: 5,
    };

    const result = calculateStrainPoints(dailyStats as any[], weeklyContext);

    console.log(`\nCase: Consistent Performer`);
    console.log(`Total Points: ${result.points}`);
    console.log(`Expected Points: ${(109 * 7) + 20 + 15}`); // 763 + 35 = 798
    console.log('Breakdown:');
    result.breakdown.components.forEach((comp: any) => {
        console.log(`  - ${comp.category}: ${comp.value} (${comp.formula}) = ${comp.points}`);
    });
    result.breakdown.bonuses.forEach((bonus: any) => {
        console.log(`  + BONUS: ${bonus.type} (${bonus.condition}) = ${bonus.points}`);
    });
}

testManufacturerScoring();
testProductScoring();
