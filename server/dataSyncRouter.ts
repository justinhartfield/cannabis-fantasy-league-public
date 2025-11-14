/**
 * Data Sync tRPC Router
 * 
 * Provides API endpoints for manually triggering data synchronization
 * and checking sync status.
 */

import { router, protectedProcedure } from './_core/trpc';
import { getDataSyncService } from './dataSync';
import { z } from 'zod';

export const dataSyncRouter = router({
  /**
   * Test Metabase connection
   * Admin only
   */
  testConnection: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const syncService = getDataSyncService();
    
    try {
      // Try to fetch a small amount of data to test connection
      await syncService.syncManufacturers();
      return {
        success: true,
        message: 'Metabase connection successful! Data sync is working.',
      };
    } catch (error) {
      console.error('[DataSync API] Connection test failed:', error);
      return {
        success: false,
        message: 'Metabase connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Manually trigger full data sync
   * Admin only
   */
  syncAll: protectedProcedure.mutation(async ({ ctx }) => {
    // Only admins can manually trigger sync
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const syncService = getDataSyncService();
    
    try {
      await syncService.syncAll();
      return {
        success: true,
        message: 'Data sync completed successfully',
      };
    } catch (error) {
      console.error('[DataSync API] Sync failed:', error);
      return {
        success: false,
        message: 'Data sync failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Sync manufacturers only
   * Admin only
   */
  syncManufacturers: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const syncService = getDataSyncService();
    
    try {
      await syncService.syncManufacturers();
      return {
        success: true,
        message: 'Manufacturer sync completed successfully',
      };
    } catch (error) {
      console.error('[DataSync API] Manufacturer sync failed:', error);
      return {
        success: false,
        message: 'Manufacturer sync failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Sync brands only
   * Admin only
   */
  syncBrands: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const syncService = getDataSyncService();
    
    try {
      await syncService.syncBrands();
      return {
        success: true,
        message: 'Brands sync completed successfully',
      };
    } catch (error) {
      console.error('[DataSync API] Brands sync failed:', error);
      return {
        success: false,
        message: 'Brands sync failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Sync strains only
   * Admin only
   */
  syncStrains: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const syncService = getDataSyncService();
    
    try {
      await syncService.syncStrains();
      return {
        success: true,
        message: 'Strain sync completed successfully',
      };
    } catch (error) {
      console.error('[DataSync API] Strain sync failed:', error);
      return {
        success: false,
        message: 'Strain sync failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Sync pharmacies only
   * Admin only
   */
  syncPharmacies: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const syncService = getDataSyncService();
    
    try {
      await syncService.syncPharmacies();
      return {
        success: true,
        message: 'Pharmacy sync completed successfully',
      };
    } catch (error) {
      console.error('[DataSync API] Pharmacy sync failed:', error);
      return {
        success: false,
        message: 'Pharmacy sync failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }),

  /**
   * Create weekly snapshot manually
   * Admin only
   */
  createWeeklySnapshot: protectedProcedure
    .input(z.object({
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const syncService = getDataSyncService();
      
      try {
        await syncService.createWeeklySnapshots(input.year, input.week);
        return {
          success: true,
          message: `Weekly snapshot created for ${input.year}-W${input.week}`,
        };
      } catch (error) {
        console.error('[DataSync API] Weekly snapshot creation failed:', error);
        return {
          success: false,
          message: 'Weekly snapshot creation failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get sync status
   * Public endpoint
   */
  getSyncStatus: protectedProcedure.query(async () => {
    // TODO: Implement sync status tracking
    // For now, return placeholder data
    return {
      lastSync: new Date().toISOString(),
      nextSync: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      status: 'healthy' as const,
      manufacturers: {
        count: 5,
        lastUpdated: new Date().toISOString(),
      },
      strains: {
        count: 5,
        lastUpdated: new Date().toISOString(),
      },
      pharmacies: {
        count: 5,
        lastUpdated: new Date().toISOString(),
      },
    };
  }),

  /**
   * Aggregate daily stats for a specific date
   * Admin only
   */
  aggregateDailyStats: protectedProcedure
    .input(z.object({
      statDate: z.string().optional(), // Format: YYYY-MM-DD, defaults to today
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { dailyStatsAggregator } = await import('./dailyStatsAggregator-v2');
      
      try {
        const statDate = input.statDate || new Date().toISOString().split('T')[0];
        await dailyStatsAggregator.aggregateForDate(statDate);
        return {
          success: true,
          message: `Daily stats aggregated successfully for ${statDate}`,
          statDate,
        };
      } catch (error) {
        console.error('[DataSync API] Daily stats aggregation failed:', error);
        return {
          success: false,
          message: 'Daily stats aggregation failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
});

