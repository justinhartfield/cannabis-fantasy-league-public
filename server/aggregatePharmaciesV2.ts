/**
 * Pharmacy aggregation with trend-based scoring for aggregator V2
 */

import { calculatePharmacyTrendScore } from './trendScoringEngine';
import { calculatePharmacyScore as calculateOldPharmacyScore } from './dailyChallengeScoringEngine';
import { fetchTrendDataForScoring } from './trendMetricsFetcher';
import { pharmacyDailyChallengeStats } from '../drizzle/dailyChallengeSchema';

interface OrderRecord {
  PharmacyName: string;
  Pharmacy: string;
  Quantity: number;
  TotalPrice: number;
}

type Database = any;
type AggregationLogger = any;
type EntityAggregationSummary = { processed: number; skipped: number };

export async function aggregatePharmaciesWithTrends(
  db: Database,
  dateString: string,
  orders: OrderRecord[],
  logger?: AggregationLogger,
  logFn?: (level: string, message: string, metadata?: any, logger?: any) => Promise<void>
): Promise<EntityAggregationSummary> {
  const log = logFn || (async () => {});
  
  await log('info', 'Aggregating pharmacies with trend-based scoring...', undefined, logger);

  // Group by pharmacy
  const stats = new Map<string, { orderCount: number; revenueCents: number }>();

  for (const order of orders) {
    const name = order.PharmacyName;
    if (!name) continue;

    const revenue = Math.round((order.TotalPrice || 0) * 100);

    const current = stats.get(name) || { orderCount: 0, revenueCents: 0 };
    current.orderCount += 1;
    current.revenueCents += revenue;
    stats.set(name, current);
  }

  const sorted = Array.from(stats.entries()).sort((a, b) => b[1].orderCount - a[1].orderCount);
  await log('info', `Found ${stats.size} unique pharmacies`, undefined, logger);

  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < sorted.length; i++) {
    const [name, data] = sorted[i];
    const rank = i + 1;

    // Find pharmacy in database
    const pharmacy = await db.query.pharmacies.findFirst({
      where: (pharmacies: any, { eq }: any) => eq(pharmacies.name, name),
    });

    if (!pharmacy) {
      skipped += 1;
      await log('warn', `Pharmacy not found: ${name}`, undefined, logger);
      continue;
    }

    try {
      // Fetch trend data
      const trendData = await fetchTrendDataForScoring(
        'pharmacy',
        name,
        pharmacy.id,
        dateString,
        rank
      );

      // Calculate trend-based score
      const trendScore = calculatePharmacyTrendScore({
        orderCount: data.orderCount,
        days1: trendData.trendMetrics?.days1 ?? 0,
        days7: trendData.trendMetrics?.days7 ?? 0,
        days14: trendData.trendMetrics?.days14 ?? 0,
        days30: trendData.trendMetrics?.days30 ?? 0,
        currentRank: rank,
        previousRank: trendData.previousRank ?? rank,
        streakDays: trendData.streakDays ?? 0,
        marketSharePercent: trendData.marketShare ?? 0,
        dailyVolumes: trendData.dailyVolumes,
      });

      // Safeguard: trendMultiplier should never be 0 (minimum is 1.0 for neutral)
      const safeTrendMultiplier = trendScore.trendMultiplier || 1.0;

      // Also calculate old score for comparison
      const oldScore = calculateOldPharmacyScore(data, rank);

      // Upsert stats with new fields
      await db
        .insert(pharmacyDailyChallengeStats)
        .values({
          pharmacyId: pharmacy.id,
          statDate: dateString,
          orderCount: data.orderCount,
          revenueCents: data.revenueCents,
          totalPoints: trendScore.totalPoints,
          rank,
          previousRank: trendData.previousRank,
          trendMultiplier: safeTrendMultiplier.toString(),
          consistencyScore: trendScore.consistencyScore,
          velocityScore: trendScore.velocityScore,
          streakDays: trendData.streakDays,
          marketSharePercent: trendData.marketShare.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            pharmacyDailyChallengeStats.pharmacyId,
            pharmacyDailyChallengeStats.statDate,
          ],
          set: {
            orderCount: data.orderCount,
            revenueCents: data.revenueCents,
            totalPoints: trendScore.totalPoints,
            rank,
            previousRank: trendData.previousRank,
            trendMultiplier: safeTrendMultiplier.toString(),
            consistencyScore: trendScore.consistencyScore,
            velocityScore: trendScore.velocityScore,
            streakDays: trendData.streakDays,
            marketSharePercent: trendData.marketShare.toString(),
            updatedAt: new Date(),
          },
        });

      processed += 1;

      await log(
        'info',
        `${name}: ${data.orderCount} orders, ${trendScore.trendMultiplier.toFixed(2)}x trend, ${trendScore.totalPoints} pts (rank #${rank})`,
        { oldScore: oldScore.totalPoints, newScore: trendScore.totalPoints },
        logger
      );
    } catch (error) {
      await log('error', `Error processing pharmacy ${name}:`, error, logger);
      skipped += 1;
    }
  }

  return { processed, skipped };
}
