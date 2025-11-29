
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getDb } from '../server/db';
import { weeklyLineups, manufacturerDailyStats } from '../drizzle/schema';
import { calculateSeasonTeamDailyScore } from '../server/scoringEngine';
import { isNotNull, desc, eq, and } from 'drizzle-orm';

async function main() {
    console.log('🔍 Debugging Scoring Breakdown...');

    const db = await getDb();
    if (!db) {
        console.error('❌ Database connection failed');
        process.exit(1);
    }

    // 1. Find a lineup with mfg1Id set (populated lineup)
    console.log('Searching for a populated lineup...');
    const lineups = await db
        .select()
        .from(weeklyLineups)
        .where(isNotNull(weeklyLineups.mfg1Id))
        .orderBy(desc(weeklyLineups.year), desc(weeklyLineups.week))
        .limit(1);

    if (lineups.length === 0) {
        console.error('❌ No populated lineups found.');
        process.exit(1);
    }

    let lineup = lineups[0];
    console.log(`✅ Found lineup: Team ${lineup.teamId}, ${lineup.year}-W${lineup.week}`);

    let tempCaptainSet = false;
    if (!lineup.captainId) {
        console.log('   Lineup has no captain. Setting mfg1 as captain temporarily...');
        await db.update(weeklyLineups)
            .set({ captainId: lineup.mfg1Id, captainType: 'manufacturer' })
            .where(eq(weeklyLineups.id, lineup.id));

        lineup.captainId = lineup.mfg1Id;
        lineup.captainType = 'manufacturer';
        tempCaptainSet = true;
    }

    console.log(`   Captain: ${lineup.captainType} #${lineup.captainId}`);
    console.log('   Lineup details:', JSON.stringify(lineup, null, 2));

    // 2. Find a recent date with stats for the captain
    console.log('Searching for a recent date with stats for the captain...');
    const stats = await db
        .select()
        .from(manufacturerDailyStats)
        .where(and(
            eq(manufacturerDailyStats.manufacturerId, lineup.captainId),
            isNotNull(manufacturerDailyStats.totalPoints)
        ))
        .orderBy(desc(manufacturerDailyStats.statDate))
        .limit(1);

    if (stats.length === 0) {
        console.error(`❌ No daily stats found for captain (Manufacturer #${lineup.captainId}).`);
        process.exit(1);
    }

    const statDate = stats[0].statDate;
    console.log(`   Found recent stats for captain on date: ${statDate}`);
    console.log(`   Stats: Points=${stats[0].totalPoints}, Sales=${stats[0].salesVolumeGrams}`);

    try {
        const result = await calculateSeasonTeamDailyScore({
            teamId: lineup.teamId,
            year: lineup.year,
            week: lineup.week,
            statDate: statDate,
        });

        console.log('\n📊 Scoring Result:');
        console.log(`   Total Points: ${result.totalPoints}`);
        console.log(`   Total Bonus: ${result.teamBonusTotal}`);

        console.log('\n🎁 Team Bonuses:');
        if (result.teamBonuses.length > 0) {
            result.teamBonuses.forEach(b => {
                console.log(`   - [${b.type}] ${b.description}: +${b.points}`);
            });
        } else {
            console.log('   (None)');
        }

        console.log('\n🧩 Breakdowns (Captain Only):');
        const captainBreakdown = result.breakdowns.find(
            b => b.assetType === lineup.captainType && b.assetId === lineup.captainId
        );

        if (captainBreakdown) {
            console.log(`   Asset: ${captainBreakdown.assetType} #${captainBreakdown.assetId}`);
            console.log(`   Points: ${captainBreakdown.points}`);
            console.log('   Bonuses in Breakdown JSON:');
            if (captainBreakdown.breakdown && captainBreakdown.breakdown.bonuses) {
                captainBreakdown.breakdown.bonuses.forEach((b: any) => {
                    console.log(`     - [${b.type}] ${b.condition}: +${b.points}`);
                });
            } else {
                console.log('     (None or breakdown structure missing)');
                console.log('     Breakdown object keys:', Object.keys(captainBreakdown.breakdown || {}));
            }
        } else {
            console.log('   ❌ Captain asset not found in breakdowns!');
            console.log('   Available assets in breakdown:', result.breakdowns.map(b => `${b.assetType} #${b.assetId}`).join(', '));
        }

    } catch (error) {
        console.error('❌ Error calculating score:', error);
    }

    process.exit(0);
}

main();
