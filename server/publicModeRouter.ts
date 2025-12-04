import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import {
  publicLegendaryStrains,
  publicTrendingStrains,
  publicEffectCategories,
  publicConsumptionTypes,
  publicTerpeneProfiles,
  publicModeLeagues,
  publicModeLineups,
  publicModeStats,
} from "../drizzle/publicModeSchema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { calculateScore, calculateLineupScore, ScoringInput } from "./publicModeScoringEngine";

/**
 * Public Mode Router
 * Handles all public mode operations including:
 * - Entity browsing (legendary strains, trending strains, effects, consumption types, terpenes)
 * - League management
 * - Draft operations
 * - Lineup management
 * - Scoring
 */

export const publicModeRouter = router({
  /**
   * Get all legendary strains
   */
  getLegendaryStrains: publicProcedure
    .input(z.object({
      tier: z.enum(['legendary', 'elite', 'classic']).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const conditions = [];
      if (input.tier) {
        conditions.push(eq(publicLegendaryStrains.tier, input.tier));
      }
      conditions.push(eq(publicLegendaryStrains.isActive, true));

      const strains = await db
        .select()
        .from(publicLegendaryStrains)
        .where(and(...conditions))
        .orderBy(desc(publicLegendaryStrains.totalOrders))
        .limit(input.limit);

      return strains;
    }),

  /**
   * Get trending strains for a specific date
   */
  getTrendingStrains: publicProcedure
    .input(z.object({
      date: z.string().optional(), // ISO date string, defaults to today
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const targetDate = input.date || new Date().toISOString().split('T')[0];

      const strains = await db
        .select()
        .from(publicTrendingStrains)
        .where(eq(publicTrendingStrains.snapshotDate, targetDate))
        .orderBy(desc(publicTrendingStrains.trendScore))
        .limit(input.limit);

      return strains;
    }),

  /**
   * Get effect categories for a specific date
   */
  getEffectCategories: publicProcedure
    .input(z.object({
      date: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const targetDate = input.date || new Date().toISOString().split('T')[0];

      const effects = await db
        .select()
        .from(publicEffectCategories)
        .where(eq(publicEffectCategories.snapshotDate, targetDate))
        .orderBy(desc(publicEffectCategories.popularityRank))
        .limit(input.limit);

      return effects;
    }),

  /**
   * Get consumption types for a specific date
   */
  getConsumptionTypes: publicProcedure
    .input(z.object({
      categoryType: z.enum(['genetics', 'thc', 'productType']).optional(),
      date: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const targetDate = input.date || new Date().toISOString().split('T')[0];

      const conditions = [eq(publicConsumptionTypes.snapshotDate, targetDate)];
      if (input.categoryType) {
        conditions.push(eq(publicConsumptionTypes.categoryType, input.categoryType));
      }

      const consumptionTypes = await db
        .select()
        .from(publicConsumptionTypes)
        .where(and(...conditions))
        .orderBy(desc(publicConsumptionTypes.marketSharePercentage))
        .limit(input.limit);

      return consumptionTypes;
    }),

  /**
   * Get terpene profiles for a specific date
   */
  getTerpeneProfiles: publicProcedure
    .input(z.object({
      date: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const targetDate = input.date || new Date().toISOString().split('T')[0];

      const terpenes = await db
        .select()
        .from(publicTerpeneProfiles)
        .where(eq(publicTerpeneProfiles.snapshotDate, targetDate))
        .orderBy(desc(publicTerpeneProfiles.popularityRank))
        .limit(input.limit);

      return terpenes;
    }),

  /**
   * Get entity stats for scoring
   */
  getEntityStats: publicProcedure
    .input(z.object({
      entityType: z.enum(['legendary', 'trending', 'effect', 'consumption', 'terpene']),
      entityId: z.number(),
      date: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const targetDate = input.date || new Date().toISOString().split('T')[0];

      const [stats] = await db
        .select()
        .from(publicModeStats)
        .where(
          and(
            eq(publicModeStats.entityType, input.entityType),
            eq(publicModeStats.entityId, input.entityId),
            eq(publicModeStats.statDate, targetDate)
          )
        )
        .limit(1);

      return stats || null;
    }),

  /**
   * Create a public mode league
   */
  createLeague: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      maxTeams: z.number().min(2).max(20).default(10),
      draftType: z.enum(['snake', 'auction', 'auto']).default('snake'),
      scoringType: z.enum(['weekly', 'daily']).default('weekly'),
      draftStartTime: z.string().optional(), // ISO timestamp
      seasonStartDate: z.string().optional(), // ISO date
      seasonEndDate: z.string().optional(), // ISO date
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in to create a league",
        });
      }

      // Generate slug from name
      const slug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const [league] = await db
        .insert(publicModeLeagues)
        .values({
          name: input.name,
          slug: `${slug}-${Date.now()}`,
          description: input.description,
          gameMode: 'public',
          ownerId: ctx.user.id,
          maxTeams: input.maxTeams,
          draftType: input.draftType,
          scoringType: input.scoringType,
          status: 'draft',
          draftStartTime: input.draftStartTime,
          seasonStartDate: input.seasonStartDate,
          seasonEndDate: input.seasonEndDate,
        })
        .returning();

      return league;
    }),

  /**
   * Get league by ID
   */
  getLeague: publicProcedure
    .input(z.object({
      leagueId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const [league] = await db
        .select()
        .from(publicModeLeagues)
        .where(eq(publicModeLeagues.id, input.leagueId))
        .limit(1);

      if (!league) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "League not found",
        });
      }

      return league;
    }),

  /**
   * Create or update lineup
   */
  setLineup: protectedProcedure
    .input(z.object({
      teamId: z.number(),
      leagueId: z.number(),
      weekNumber: z.number().optional(),
      gameDate: z.string().optional(),
      legendaryStrainId: z.number().optional(),
      trendingStrainId: z.number().optional(),
      effectCategoryId: z.number().optional(),
      consumptionTypeId: z.number().optional(),
      terpeneProfileId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Must be logged in to set lineup",
        });
      }

      // Check if lineup exists
      const conditions = [
        eq(publicModeLineups.teamId, input.teamId),
        eq(publicModeLineups.leagueId, input.leagueId),
      ];

      if (input.weekNumber) {
        conditions.push(eq(publicModeLineups.weekNumber, input.weekNumber));
      }

      const [existingLineup] = await db
        .select()
        .from(publicModeLineups)
        .where(and(...conditions))
        .limit(1);

      if (existingLineup) {
        // Update existing lineup
        const [updatedLineup] = await db
          .update(publicModeLineups)
          .set({
            legendaryStrainId: input.legendaryStrainId,
            trendingStrainId: input.trendingStrainId,
            effectCategoryId: input.effectCategoryId,
            consumptionTypeId: input.consumptionTypeId,
            terpeneProfileId: input.terpeneProfileId,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(publicModeLineups.id, existingLineup.id))
          .returning();

        return updatedLineup;
      } else {
        // Create new lineup
        const [newLineup] = await db
          .insert(publicModeLineups)
          .values({
            teamId: input.teamId,
            leagueId: input.leagueId,
            weekNumber: input.weekNumber,
            gameDate: input.gameDate,
            legendaryStrainId: input.legendaryStrainId,
            trendingStrainId: input.trendingStrainId,
            effectCategoryId: input.effectCategoryId,
            consumptionTypeId: input.consumptionTypeId,
            terpeneProfileId: input.terpeneProfileId,
          })
          .returning();

        return newLineup;
      }
    }),

  /**
   * Get lineup for a team
   */
  getLineup: publicProcedure
    .input(z.object({
      teamId: z.number(),
      weekNumber: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const conditions = [eq(publicModeLineups.teamId, input.teamId)];
      if (input.weekNumber) {
        conditions.push(eq(publicModeLineups.weekNumber, input.weekNumber));
      }

      const [lineup] = await db
        .select()
        .from(publicModeLineups)
        .where(and(...conditions))
        .orderBy(desc(publicModeLineups.createdAt))
        .limit(1);

      return lineup || null;
    }),

  /**
   * Calculate lineup score
   */
  calculateLineupScore: publicProcedure
    .input(z.object({
      lineupId: z.number(),
      date: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const targetDate = input.date || new Date().toISOString().split('T')[0];

      // Get lineup
      const [lineup] = await db
        .select()
        .from(publicModeLineups)
        .where(eq(publicModeLineups.id, input.lineupId))
        .limit(1);

      if (!lineup) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lineup not found",
        });
      }

      // Get stats for each position
      const entityIds = [
        { type: 'legendary' as const, id: lineup.legendaryStrainId },
        { type: 'trending' as const, id: lineup.trendingStrainId },
        { type: 'effect' as const, id: lineup.effectCategoryId },
        { type: 'consumption' as const, id: lineup.consumptionTypeId },
        { type: 'terpene' as const, id: lineup.terpeneProfileId },
      ].filter(entity => entity.id !== null);

      const scores = [];

      for (const entity of entityIds) {
        const [stats] = await db
          .select()
          .from(publicModeStats)
          .where(
            and(
              eq(publicModeStats.entityType, entity.type),
              eq(publicModeStats.entityId, entity.id!),
              eq(publicModeStats.statDate, targetDate)
            )
          )
          .limit(1);

        if (stats) {
          scores.push({
            entityType: entity.type,
            entityId: entity.id!,
            totalPoints: stats.totalPoints,
            breakdown: {
              ordersScore: stats.ordersScore,
              trendScore: stats.trendScore,
              userEngagementScore: stats.userEngagementScore,
              bonuses: [
                stats.viralBonus && 'Viral (+25%)',
                stats.communityFavoriteBonus && 'Community Favorite (+15%)',
                stats.coPurchaseBonus && 'Co-Purchase (+10%)',
                stats.streakBonus && 'Streak (+10%)',
              ].filter(Boolean),
            },
          });
        }
      }

      const totalScore = scores.reduce((sum, score) => sum + score.totalPoints, 0);

      return {
        lineupId: input.lineupId,
        date: targetDate,
        scores,
        totalScore,
      };
    }),
});
