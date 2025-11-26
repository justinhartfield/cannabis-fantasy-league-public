/**
 * Pharmacy aggregation with trend-based scoring for aggregator V2
 */

import { calculatePharmacyTrendScore, TrendScoringStats } from './trendScoringEngine';
import { fetchTrendDataForScoring, fetchTotalMarketVolume, fetchTrendMetricsBatch } from './trendMetricsFetcher';
import { pharmacyDailyChallengeStats } from '../drizzle/dailyChallengeSchema';
import { pLimit } from './utils/concurrency';

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
  const log = logFn || (async () => { });

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

  // Prefetch data for optimization
  const allNames = sorted.map(([name]) => name);
  const [totalVolume, batchTrendMetrics] = await Promise.all([
    fetchTotalMarketVolume('pharmacyName'),
    fetchTrendMetricsBatch('pharmacyName', allNames)
  ]);

  let processed = 0;
  let skipped = 0;

  await pLimit(sorted, 20, async ([name, data], index) => {
    const rank = index + 1;

    // Find pharmacy in database
    const pharmacy = await db.query.pharmacies.findFirst({
      where: (pharmacies: any, { eq }: any) => eq(pharmacies.name, name),
    });

    if (!pharmacy) {
      skipped += 1;
      await log('warn', `Pharmacy not found: ${name}`, undefined, logger);
      return;
    }

    try {
      // Fetch trend data
      const trendData = await fetchTrendDataForScoring(
        'pharmacyName',
        name,
        pharmacy.id,
        dateString,
        rank,
        totalVolume,
        batchTrendMetrics.get(name)
      );

      // Calculate trend-based score
      // If trend data is missing, use precomputed neutral multiplier instead of bad fallback data
      const stats: TrendScoringStats = {
        orderCount: data.orderCount,
        // Only use trend data if it exists, otherwise let the scoring engine use neutral multiplier
        days1: trendData.trendMetrics?.days1,
        days7: trendData.trendMetrics?.days7,
        days14: trendData.trendMetrics?.days14,
        days30: trendData.trendMetrics?.days30,
        // Use neutral 1.0x multiplier when trend data is missing (prevents 5x hype bonus)
        trendMultiplier: trendData.trendMetrics ? undefined : 1.0,
        previousRank: trendData.previousRank,
        currentRank: rank,
        streakDays: trendData.streakDays,
        marketSharePercent: trendData.marketShare,
        dailyVolumes: trendData.dailyVolumes,
      };

      const trendScore = calculatePharmacyTrendScore(stats);

      // Safeguard: trendMultiplier should never be 0 (minimum is 1.0 for neutral)
      const safeTrendMultiplier = trendScore.trendMultiplier || 1.0;

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
    } catch (error) {
      await log('error', `Error processing pharmacy ${name}:`, error, logger);
      skipped += 1;
    }
  });

  await log('info', `Processed ${processed} pharmacies, skipped ${skipped}`, undefined, logger);
  return { processed, skipped };
}
