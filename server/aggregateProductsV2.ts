/**
 * Product aggregation with trend-based scoring for aggregator V2
 */

import { calculateProductTrendScore } from './trendScoringEngine';
import { calculateProductScore as calculateOldProductScore } from './dailyChallengeScoringEngine';
import { fetchTrendDataForScoring } from './trendMetricsFetcher';
import { productDailyChallengeStats } from '../drizzle/dailyChallengeSchema';

interface OrderRecord {
  Product: string;
  Quantity: number;
  TotalPrice: number;
}

type Database = any;
type AggregationLogger = any;
type EntityAggregationSummary = { processed: number; skipped: number };

export async function aggregateProductsWithTrends(
  db: Database,
  dateString: string,
  orders: OrderRecord[],
  logger?: AggregationLogger,
  logFn?: (level: string, message: string, metadata?: any, logger?: any) => Promise<void>
): Promise<EntityAggregationSummary> {
  const log = logFn || (async () => {});
  
  await log('info', 'Aggregating products with trend-based scoring...', undefined, logger);

  // Group by product
  const stats = new Map<string, { salesVolumeGrams: number; orderCount: number }>();

  for (const order of orders) {
    const name = order.Product;
    if (!name) continue;

    const quantity = order.Quantity || 0;

    const current = stats.get(name) || { salesVolumeGrams: 0, orderCount: 0 };
    current.salesVolumeGrams += quantity;
    current.orderCount += 1;
    stats.set(name, current);
  }

  const sorted = Array.from(stats.entries()).sort((a, b) => b[1].salesVolumeGrams - a[1].salesVolumeGrams);
  await log('info', `Found ${stats.size} unique products`, undefined, logger);

  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < sorted.length; i++) {
    const [name, data] = sorted[i];
    const rank = i + 1;

    // Find product in database (products are stored in strains table)
    const product = await db.query.strains.findFirst({
      where: (strains: any, { eq }: any) => eq(strains.name, name),
    });

    if (!product) {
      skipped += 1;
      await log('warn', `Product not found: ${name}`, undefined, logger);
      continue;
    }

    try {
      // Fetch trend data
      const trendData = await fetchTrendDataForScoring(
        'product',
        name,
        product.id,
        dateString,
        rank
      );

      // Calculate trend-based score
      const trendScore = calculateProductTrendScore({
        orderCount: data.orderCount,
        trendMultiplier: trendData.trendMetrics?.days7 && trendData.trendMetrics?.days1
          ? trendData.trendMetrics.days7 / trendData.trendMetrics.days1
          : 1.0,
        rank,
        previousRank: trendData.previousRank ?? rank,
        consistencyScore: trendData.consistencyScore ?? 0,
        velocityScore: trendData.velocityScore ?? 0,
        streakDays: trendData.streakDays ?? 0,
        marketSharePercent: trendData.marketShare ?? 0,
      });

      // Also calculate old score for comparison
      const oldScore = calculateOldProductScore(data, rank);

      // Upsert stats with new fields
      await db
        .insert(productDailyChallengeStats)
        .values({
          productId: product.id,
          statDate: dateString,
          salesVolumeGrams: data.salesVolumeGrams,
          orderCount: data.orderCount,
          totalPoints: trendScore.totalPoints,
          rank,
          previousRank: trendData.previousRank,
          trendMultiplier: trendScore.trendMultiplier.toString(),
          consistencyScore: trendScore.consistencyScore,
          velocityScore: trendScore.velocityScore,
          streakDays: trendData.streakDays,
          marketSharePercent: trendData.marketShare.toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            productDailyChallengeStats.productId,
            productDailyChallengeStats.statDate,
          ],
          set: {
            salesVolumeGrams: data.salesVolumeGrams,
            orderCount: data.orderCount,
            totalPoints: trendScore.totalPoints,
            rank,
            previousRank: trendData.previousRank,
            trendMultiplier: trendScore.trendMultiplier.toString(),
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
      await log('error', `Error processing product ${name}:`, error, logger);
      skipped += 1;
    }
  }

  return { processed, skipped };
}
