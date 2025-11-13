/**
 * Admin tRPC Router
 * Provides endpoints for admin dashboard and data sync control
 */

import { router, protectedProcedure } from '../_core/trpc';
import { getDataSyncServiceV2 } from '../services/dataSyncService';
import { db } from '../db';
import { syncJobs, syncLogs, cannabisStrains, brands, manufacturers } from '../../drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';

export const adminRouter = router({
  /**
   * Trigger strain sync
   */
  syncStrains: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

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
  syncBrands: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

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
  syncManufacturers: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

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
   * Trigger full sync (all data sources)
   */
  syncAll: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

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
   * Get recent sync jobs
   */
  getSyncJobs: protectedProcedure
    .input(z.object({
      limit: z.number().optional().default(20),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

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
  getJobLogs: protectedProcedure
    .input(z.object({
      jobId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

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
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Get counts
    const [strainCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(cannabisStrains);
    
    const [brandCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(brands);
    
    const [mfgCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(manufacturers);

    // Get last successful sync times for each type
    const lastStrainSync = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.jobName, 'sync-strains'))
      .where(eq(syncJobs.status, 'completed'))
      .orderBy(desc(syncJobs.completedAt))
      .limit(1);

    const lastBrandSync = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.jobName, 'sync-brands'))
      .where(eq(syncJobs.status, 'completed'))
      .orderBy(desc(syncJobs.completedAt))
      .limit(1);

    const lastMfgSync = await db
      .select()
      .from(syncJobs)
      .where(eq(syncJobs.jobName, 'sync-manufacturers'))
      .where(eq(syncJobs.status, 'completed'))
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
    };
  }),
});
