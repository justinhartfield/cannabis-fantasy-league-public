/**
 * Debug Router
 * 
 * Provides debug endpoints for troubleshooting
 */

import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDb } from './db';
import { strainDailyChallengeStats } from '../drizzle/dailyChallengeSchema';
import { cannabisStrains } from '../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export const debugRouter = router({
  /**
   * Check strain trend data for debugging
   */
  checkStrainTrendData: protectedProcedure
    .input(z.object({
      strainNames: z.array(z.string()).optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const results = [];
      const strainNames = input?.strainNames || ['Pink Kush', 'Hindu Kush', 'Modified Grapes'];

      // First, get all available strain names for reference
      const allStrains = await db.query.cannabisStrains.findMany({
        columns: { id: true, name: true },
        limit: 100,
      });

      for (const strainName of strainNames) {
        // Find the strain (case-insensitive)
        const strain = await db.query.cannabisStrains.findFirst({
          where: (cannabisStrains, { sql }) => sql`LOWER(${cannabisStrains.name}) = LOWER(${strainName})`,
        });

        if (!strain) {
          results.push({
            strainName,
            found: false,
            message: 'Strain not found in database',
          });
          continue;
        }

        // Get the latest stats for this strain
        const stats = await db
          .select()
          .from(strainDailyChallengeStats)
          .where(eq(strainDailyChallengeStats.strainId, strain.id))
          .orderBy(desc(strainDailyChallengeStats.statDate))
          .limit(3);

        if (stats.length === 0) {
          results.push({
            strainName,
            strainId: strain.id,
            found: true,
            hasStats: false,
            message: 'No stats found for this strain',
          });
          continue;
        }

        const latestStats = stats.map((stat) => {
          const hasTrendData = 
            (stat.trendMultiplier !== null && stat.trendMultiplier !== undefined && Number(stat.trendMultiplier) !== 0) ||
            (stat.streakDays !== null && Number(stat.streakDays ?? 0) > 0) ||
            (stat.previousRank !== null && stat.previousRank !== undefined && stat.previousRank !== 0);

          return {
            statDate: stat.statDate,
            orderCount: stat.orderCount,
            salesVolumeGrams: stat.salesVolumeGrams,
            totalPoints: stat.totalPoints,
            rank: stat.rank,
            previousRank: stat.previousRank,
            trendMultiplier: stat.trendMultiplier,
            trendMultiplierType: typeof stat.trendMultiplier,
            trendMultiplierNumber: Number(stat.trendMultiplier),
            consistencyScore: stat.consistencyScore,
            velocityScore: stat.velocityScore,
            streakDays: stat.streakDays,
            marketSharePercent: stat.marketSharePercent,
            wouldUseTrendScoring: hasTrendData,
          };
        });

        results.push({
          strainName,
          strainId: strain.id,
          found: true,
          hasStats: true,
          latestStats,
        });
      }

      return {
        results,
        availableStrains: allStrains.map(s => s.name).slice(0, 50),
      };
    }),
});
