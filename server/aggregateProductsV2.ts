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

  // Products use Metabase Card 1269 (today) instead of order records
  // because order.Product contains MongoDB IDs, not names
  const { getMetabaseClient } = await import('./metabase');
  const metabase = getMetabaseClient();
  
  const isToday = dateString === new Date().toISOString().split('T')[0];
  let productData;
  
  if (isToday) {
    await log('info', 'Using today\'s products query (card 1269)', undefined, logger);
    productData = await metabase.executeCardQuery(1269);
  } else {
    await log('info', 'Using yesterday\'s products query (public)', undefined, logger);
    productData = await metabase.executePublicQuery('56623750-b096-445c-a130-7518fd629491');
  }
  
  await log('info', `Fetched ${productData.length} products from Metabase`, undefined, logger);
  
  const sorted = productData; // Already sorted by Metabase query

  let processed = 0;
  let skipped = 0;

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const rank = i + 1;
    
    // Metabase query returns: Name, Quantity (grams), Sales, Orders, etc.
    const name = item.Name;
    if (!name) {
      skipped += 1;
      continue;
    }

    const salesVolumeGrams = item.Quantity || 0;
    const orderCount = item.Orders || 0;

    // Find product in database (products are stored in strains table)
    const product = await db.query.strains.findFirst({
      where: (strains: any, { eq }: any) => eq(strains.name, name),
    });

    if (!product) {
      skipped += 1;
      await log('warn', `Product not found in database: ${name}`, undefined, logger);
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
        orderCount,
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
      const oldScore = calculateOldProductScore({ salesVolumeGrams, orderCount }, rank);

      // Upsert stats with new fields
      await db
        .insert(productDailyChallengeStats)
        .values({
          productId: product.id,
          statDate: dateString,
          salesVolumeGrams,
          orderCount,
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
            productDailyChallengeStats.productId,
            productDailyChallengeStats.statDate,
          ],
          set: {
            salesVolumeGrams,
            orderCount,
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
      await log('error', `Error processing product ${name}:`, error, logger);
      skipped += 1;
    }
  }

  return { processed, skipped };
}
