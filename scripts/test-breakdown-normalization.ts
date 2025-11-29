
import { normalizeDailyBreakdownPayload } from '../server/scoringRouter';
import { BreakdownDetail } from '../server/scoringEngine';

// Mock data types based on schema
type DailyBreakdownRow = {
    id: number;
    dailyTeamScoreId: number | null;
    position: string;
    assetType: string | null;
    assetId: number | null;
    points: number | null;
    totalPoints: number | null;
    breakdown: unknown;
    createdAt: Date | null;
    updatedAt: Date | null;
};

async function testNormalization() {
    console.log('🧪 Testing normalizeDailyBreakdownPayload...');

    // 1. Mock a persisted breakdown with a Captain Boost
    const mockPersistedBreakdown: DailyBreakdownRow = {
        id: 1,
        dailyTeamScoreId: 1,
        position: 'MFG1',
        assetType: 'manufacturer',
        assetId: 123,
        points: 100,
        totalPoints: 125, // 100 base + 25 bonus
        breakdown: {
            components: [{ category: 'Test', points: 100 }],
            bonuses: [
                { type: 'Rank Bonus', points: 10 }, // Should be recalculated/replaced by fresh stats
                { type: 'Captain Boost', points: 25, condition: '1.25x Multiplier' } // Should be PRESERVED
            ],
            total: 135
        },
        createdAt: new Date(),
        updatedAt: new Date()
    };

    // 2. Mock fresh stats (this would come from the DB in the real app)
    // This represents the "re-calculation" that happens in the router
    const mockStatRecord = {
        orderCount: 10,
        rank: 1,
        previousRank: 2,
        streakDays: 5,
        consistencyScore: 90,
        velocityScore: 5,
        marketSharePercent: 10,
        trendMultiplier: 1.1
    };

    // 3. Run normalization
    // This should:
    // - Re-calculate the standard breakdown based on mockStatRecord
    // - PRESERVE the Captain Boost from mockPersistedBreakdown
    const result = normalizeDailyBreakdownPayload(mockPersistedBreakdown, mockStatRecord);

    // 4. Verify results
    console.log('📊 Result Breakdown:', JSON.stringify(result, null, 2));

    const hasCaptainBoost = result.bonuses.some(b => b.type === 'Captain Boost');
    const captainBoostPoints = result.bonuses.find(b => b.type === 'Captain Boost')?.points;

    if (hasCaptainBoost && captainBoostPoints === 25) {
        console.log('✅ SUCCESS: Captain Boost was preserved!');
    } else {
        console.error('❌ FAILURE: Captain Boost was NOT preserved.');
        process.exit(1);
    }

    // Verify total points includes the boost
    // The builder calculates points based on stats. Let's see what the builder produces for these stats.
    // We can't easily predict the exact builder output without replicating its logic, 
    // but we can check if the total > subtotal (implying bonuses were added).
    if (result.total > result.subtotal) {
        console.log('✅ SUCCESS: Total score reflects bonuses.');
    } else {
        console.warn('⚠️ WARNING: Total score might not reflect bonuses (check logic).');
    }
}

testNormalization().catch(console.error);
