/**
 * Admin tRPC Router
 * Provides endpoints for admin dashboard and data sync control
 */

import { adminProcedure, router } from '../_core/trpc';
import { getDataSyncServiceV2 } from '../services/dataSyncService';
import { getDb } from '../db';
import { syncJobs, syncLogs, cannabisStrains, brands, manufacturers, dailyTeamScores, teams, weeklyTeamScores, strains } from '../../drizzle/schema';
import { eq, desc, sql, gte, and } from 'drizzle-orm';
import { z } from 'zod';
import { createSyncJob } from '../services/syncLogger';
import { dailyChallengeAggregatorV2 } from '../dailyChallengeAggregatorV2';
import {
  manufacturerDailyChallengeStats,
  strainDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats,
} from '../../drizzle/dailyChallengeSchema';

export const adminRouter = router({
  /**
   * Trigger strain sync
   */
  syncStrains: adminProcedure.mutation(async ({ ctx }) => {

    const syncService = getDataSyncServiceV2();

    try {
      // Run sync in background (don't await)
      syncService.syncStrains().catch(err => {
        console.error('[Admin] Strain sync background error:', err);
      });

      return {
        success: true,
        message: 'Strain sync started successfully',
      };
    } catch (error) {
      console.error('[Admin] Failed to start strain sync:', error);
      return {
        success: false,
        message: 'Failed to start strain sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Trigger brand sync
   */
  syncBrands: adminProcedure.mutation(async ({ ctx }) => {

    const syncService = getDataSyncServiceV2();

    try {
      // Run sync in background (don't await)
      syncService.syncBrands().catch(err => {
        console.error('[Admin] Brand sync background error:', err);
      });

      return {
        success: true,
        message: 'Brand sync started successfully',
      };
    } catch (error) {
      console.error('[Admin] Failed to start brand sync:', error);
      return {
        success: false,
        message: 'Failed to start brand sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Trigger manufacturer sync
   */
  syncManufacturers: adminProcedure.mutation(async ({ ctx }) => {

    const syncService = getDataSyncServiceV2();

    try {
      // Run sync in background (don't await)
      syncService.syncManufacturers().catch(err => {
        console.error('[Admin] Manufacturer sync background error:', err);
      });

      return {
        success: true,
        message: 'Manufacturer sync started successfully',
      };
    } catch (error) {
      console.error('[Admin] Failed to start manufacturer sync:', error);
      return {
        success: false,
        message: 'Failed to start manufacturer sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Trigger daily stats sync
   */
  syncDailyStats: adminProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).default({}))
    .mutation(async ({ ctx, input }) => {
      const syncService = getDataSyncServiceV2();

      try {
        syncService.syncDailyStats(input.date).catch(err => {
          console.error('[Admin] Daily stats sync background error:', err);
        });

        return {
          success: true,
          message: `Daily stats sync started for ${input.date || 'today'}`,
        };
      } catch (error) {
        console.error('[Admin] Failed to start daily stats sync:', error);
        return {
          success: false,
          message: 'Failed to start daily stats sync',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Trigger daily challenge stats sync (Metabase order aggregation)
   */
  syncDailyChallengeStats: adminProcedure
    .input(
      z.object({
        statDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      const statDate = input?.statDate || new Date().toISOString().split('T')[0];
      const logger = await createSyncJob('sync-daily-challenge');

      try {
        await logger.updateJobStatus(
          'running',
          `Starting daily challenge sync for ${statDate}`
        );

        const summary = await dailyChallengeAggregatorV2.aggregateForDate(statDate, {
          logger: {
            info: (message, metadata) => logger.info(message, metadata),
            warn: (message, metadata) => logger.warn(message, metadata),
            error: (message, metadata) => logger.error(message, metadata),
          },
          useTrendScoring: true,
        });

        await logger.info('Daily challenge stats sync complete', { ...summary });
        await logger.updateJobStatus('completed', `Daily challenge stats synced for ${statDate}`);

        return {
          success: true,
          message: `Daily challenge stats sync started for ${statDate}`,
          statDate,
          summary,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logger.error('Daily challenge stats sync failed', {
          error: errorMessage,
        });
        await logger.updateJobStatus('failed', errorMessage);

        return {
          success: false,
          message: 'Failed to start daily challenge stats sync',
          error: errorMessage,
        };
      }
    }),

  /**
   * Backfill daily challenge stats for a date range
   */
  backfillDailyChallengeStats: adminProcedure
    .input(
      z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { startDate, endDate } = input;
      const logger = await createSyncJob('backfill-daily-challenge');

      try {
        await logger.updateJobStatus(
          'running',
          `Starting backfill from ${startDate} to ${endDate}`
        );

        const start = new Date(startDate);
        const end = new Date(endDate);
        const results = [];

        for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          await logger.info(`Processing ${dateStr}...`);

          try {
            const summary = await dailyChallengeAggregatorV2.aggregateForDate(dateStr, {
              logger: {
                info: (message, metadata) => logger.info(message, metadata),
                warn: (message, metadata) => logger.warn(message, metadata),
                error: (message, metadata) => logger.error(message, metadata),
              },
              useTrendScoring: true,
            });
            results.push({ date: dateStr, success: true, summary });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await logger.error(`Failed to process ${dateStr}`, { error: msg });
            results.push({ date: dateStr, success: false, error: msg });
          }
        }

        await logger.updateJobStatus('completed', `Backfill completed from ${startDate} to ${endDate}`);

        return {
          success: true,
          message: `Backfill completed`,
          results,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await logger.error('Backfill failed', { error: errorMessage });
        await logger.updateJobStatus('failed', errorMessage);

        return {
          success: false,
          message: 'Backfill failed',
          error: errorMessage,
        };
      }
    }),

  /**
   * Trigger products sync
   */
  syncProducts: adminProcedure.mutation(async ({ ctx }) => {

    const syncService = getDataSyncServiceV2();

    try {
      // Run sync in background (don't await)
      syncService.syncProducts().catch(err => {
        console.error('[Admin] Products sync background error:', err);
      });

      return {
        success: true,
        message: 'Products sync started successfully',
      };
    } catch (error) {
      console.error('[Admin] Failed to start products sync:', error);
      return {
        success: false,
        message: 'Failed to start products sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Trigger full sync (all data sources)
   */
  syncAll: adminProcedure.mutation(async ({ ctx }) => {

    const syncService = getDataSyncServiceV2();

    try {
      // Run sync in background (don't await)
      syncService.syncAll().catch(err => {
        console.error('[Admin] Full sync background error:', err);
      });

      return {
        success: true,
        message: 'Full data sync started successfully',
      };
    } catch (error) {
      console.error('[Admin] Failed to start full sync:', error);
      return {
        success: false,
        message: 'Failed to start full sync',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Sync weekly stats for a specific year and week
   */
  syncWeeklyStats: adminProcedure
    .input(z.object({
      year: z.number().min(2020).max(2030),
      week: z.number().min(1).max(53),
    }))
    .mutation(async ({ ctx, input }) => {
      const syncService = getDataSyncServiceV2();

      try {
        // Run sync in background (don't await fully)
        syncService.syncWeeklyStats(input.year, input.week).catch(err => {
          console.error('[Admin] Weekly stats sync background error:', err);
        });

        return {
          success: true,
          message: `Weekly stats sync started for ${input.year}-W${input.week}`,
        };
      } catch (error) {
        console.error('[Admin] Failed to start weekly stats sync:', error);
        return {
          success: false,
          message: 'Failed to start weekly stats sync',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get recent sync jobs
   */
  getSyncJobs: adminProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const jobs = await db
        .select()
        .from(syncJobs)
        .orderBy(desc(syncJobs.createdAt))
        .limit(input.limit);

      return jobs;
    }),

  /**
   * Get logs for a specific job
   */
  getJobLogs: adminProcedure
    .input(z.object({
      jobId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const logs = await db
        .select()
        .from(syncLogs)
        .where(eq(syncLogs.jobId, input.jobId))
        .orderBy(syncLogs.timestamp);

      return logs;
    }),

  /**
   * Get dashboard stats (data freshness and counts)
   */
  getDashboardStats: adminProcedure.query(async ({ ctx }) => {
    // Get counts
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [strainCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cannabisStrains);

    const [brandCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(brands);

    const [mfgCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(manufacturers);

    const [productCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(strains);

    // Get last successful sync times for each type
    const lastStrainSync = await db
      .select()
      .from(syncJobs)
      .where(and(
        eq(syncJobs.jobName, 'sync-strains'),
        eq(syncJobs.status, 'completed'),
      ))
      .orderBy(desc(syncJobs.completedAt))
      .limit(1);

    const lastBrandSync = await db
      .select()
      .from(syncJobs)
      .where(and(
        eq(syncJobs.jobName, 'sync-brands'),
        eq(syncJobs.status, 'completed'),
      ))
      .orderBy(desc(syncJobs.completedAt))
      .limit(1);

    const lastMfgSync = await db
      .select()
      .from(syncJobs)
      .where(and(
        eq(syncJobs.jobName, 'sync-manufacturers'),
        eq(syncJobs.status, 'completed'),
      ))
      .orderBy(desc(syncJobs.completedAt))
      .limit(1);

    const lastProductSync = await db
      .select()
      .from(syncJobs)
      .where(and(
        eq(syncJobs.jobName, 'sync-products'),
        eq(syncJobs.status, 'completed'),
      ))
      .orderBy(desc(syncJobs.completedAt))
      .limit(1);

    return {
      strains: {
        count: Number(strainCount.count),
        lastSync: lastStrainSync[0]?.completedAt || null,
      },
      brands: {
        count: Number(brandCount.count),
        lastSync: lastBrandSync[0]?.completedAt || null,
      },
      manufacturers: {
        count: Number(mfgCount.count),
        lastSync: lastMfgSync[0]?.completedAt || null,
      },
      products: {
        count: Number(productCount.count),
        lastSync: lastProductSync[0]?.completedAt || null,
      },
    };
  }),

  /**
   * Get latest stat dates for daily challenge data sources
   */
  getDailyChallengeStatsSummary: adminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const defaultSummary = { latestStatDate: null, records: 0 };

    const [manufacturerSummary, strainSummary, pharmacySummary, brandSummary] = await Promise.all([
      db
        .select({
          latestStatDate: sql<string | null>`MAX(${manufacturerDailyChallengeStats.statDate})`,
          records: sql<number>`COUNT(*)`,
        })
        .from(manufacturerDailyChallengeStats),
      db
        .select({
          latestStatDate: sql<string | null>`MAX(${strainDailyChallengeStats.statDate})`,
          records: sql<number>`COUNT(*)`,
        })
        .from(strainDailyChallengeStats),
      db
        .select({
          latestStatDate: sql<string | null>`MAX(${pharmacyDailyChallengeStats.statDate})`,
          records: sql<number>`COUNT(*)`,
        })
        .from(pharmacyDailyChallengeStats),
      db
        .select({
          latestStatDate: sql<string | null>`MAX(${brandDailyChallengeStats.statDate})`,
          records: sql<number>`COUNT(*)`,
        })
        .from(brandDailyChallengeStats),
    ]);

    return {
      manufacturers: manufacturerSummary[0] ?? defaultSummary,
      strains: strainSummary[0] ?? defaultSummary,
      pharmacies: pharmacySummary[0] ?? defaultSummary,
      brands: brandSummary[0] ?? defaultSummary,
    };
  }),

  /**
   * Get rolling averages for each daily challenge position
   */
  getDailyChallengePositionAverages: adminProcedure
    .input(z.object({
      windowDays: z.number().min(1).max(90).default(7),
    }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const windowDays = input?.windowDays ?? 7;
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (windowDays - 1));

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const [averages] = await db
        .select({
          sampleSize: sql<number>`COUNT(*)`,
          mfg1Avg: sql<number | null>`AVG(${dailyTeamScores.mfg1Points})`,
          mfg2Avg: sql<number | null>`AVG(${dailyTeamScores.mfg2Points})`,
          cstr1Avg: sql<number | null>`AVG(${dailyTeamScores.cstr1Points})`,
          cstr2Avg: sql<number | null>`AVG(${dailyTeamScores.cstr2Points})`,
          prd1Avg: sql<number | null>`AVG(${dailyTeamScores.prd1Points})`,
          prd2Avg: sql<number | null>`AVG(${dailyTeamScores.prd2Points})`,
          phm1Avg: sql<number | null>`AVG(${dailyTeamScores.phm1Points})`,
          phm2Avg: sql<number | null>`AVG(${dailyTeamScores.phm2Points})`,
          brd1Avg: sql<number | null>`AVG(${dailyTeamScores.brd1Points})`,
          flexAvg: sql<number | null>`AVG(${dailyTeamScores.flexPoints})`,
        })
        .from(dailyTeamScores)
        .where(gte(dailyTeamScores.statDate, startDateStr));

      const average = (...values: Array<number | null | undefined>) => {
        const valid = values
          .map((value) => (value === null || value === undefined ? null : Number(value)))
          .filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
        if (valid.length === 0) return null;
        const sum = valid.reduce((acc, value) => acc + value, 0);
        return Number((sum / valid.length).toFixed(2));
      };

      const formatValue = (value: number | null | undefined) =>
        value === null || value === undefined ? null : Number(Number(value).toFixed(2));

      return {
        windowDays,
        range: {
          startDate: startDateStr,
          endDate: endDateStr,
        },
        sampleSize: Number(averages?.sampleSize || 0),
        positions: {
          manufacturer: {
            avg: average(averages?.mfg1Avg, averages?.mfg2Avg),
            slots: {
              mfg1: formatValue(averages?.mfg1Avg),
              mfg2: formatValue(averages?.mfg2Avg),
            },
          },
          cannabisStrain: {
            avg: average(averages?.cstr1Avg, averages?.cstr2Avg),
            slots: {
              cstr1: formatValue(averages?.cstr1Avg),
              cstr2: formatValue(averages?.cstr2Avg),
            },
          },
          product: {
            avg: average(averages?.prd1Avg, averages?.prd2Avg),
            slots: {
              prd1: formatValue(averages?.prd1Avg),
              prd2: formatValue(averages?.prd2Avg),
            },
          },
          pharmacy: {
            avg: average(averages?.phm1Avg, averages?.phm2Avg),
            slots: {
              phm1: formatValue(averages?.phm1Avg),
              phm2: formatValue(averages?.phm2Avg),
            },
          },
          brand: {
            avg: formatValue(averages?.brd1Avg),
            slots: {
              brd1: formatValue(averages?.brd1Avg),
            },
          },
          flex: {
            avg: formatValue(averages?.flexAvg),
            slots: {
              flex: formatValue(averages?.flexAvg),
            },
          },
        },
      };
    }),

  /**
   * Reset Hall of Fame scores (season totals + weekly team scores)
   *
   * This sets all team season points and weekly team scores back to zero so that
   * the Hall of Fame leaderboard starts fresh. This is a destructive operation
   * and should only be used intentionally from the admin dashboard.
   */
  resetHallOfFame: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    try {
      await db.transaction(async (tx) => {
        // Reset season-long team points used by Hall of Fame "Season Legends"
        await tx.update(teams).set({
          pointsFor: 0,
        });

        // Reset weekly team scores used by Hall of Fame "Weekly High Scores"
        await tx.update(weeklyTeamScores).set({
          mfg1Points: 0,
          mfg2Points: 0,
          cstr1Points: 0,
          cstr2Points: 0,
          prd1Points: 0,
          prd2Points: 0,
          phm1Points: 0,
          phm2Points: 0,
          brd1Points: 0,
          flexPoints: 0,
          bonusPoints: 0,
          penaltyPoints: 0,
          totalPoints: 0,
        });
      });

      return {
        success: true,
        message: 'Hall of Fame scores have been reset.',
      };
    } catch (error) {
      console.error('[Admin] Failed to reset Hall of Fame scores:', error);
      return {
        success: false,
        message: 'Failed to reset Hall of Fame scores',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),
});
