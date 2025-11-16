/**
 * Scoring tRPC Router
 * 
 * Provides API endpoints for scoring operations and viewing scoring breakdowns.
 */

import { router, protectedProcedure } from './_core/trpc';

// ============================================================================
// In-Memory Score Cache
// ============================================================================
// Simple in-memory cache for challenge scores to dramatically improve performance
// Cache TTL is 5 minutes - scores are recalculated hourly by background job

interface ScoreCache {
  scores: any[];
  timestamp: number;
}

const challengeScoreCache = new Map<string, ScoreCache>();
const SCORE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedScores(challengeId: number, statDate: string): any[] | null {
  const cacheKey = `${challengeId}-${statDate}`;
  const cached = challengeScoreCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < SCORE_CACHE_TTL) {
    console.log(`[ScoreCache] Cache HIT for ${cacheKey}`);
    return cached.scores;
  }
  
  console.log(`[ScoreCache] Cache MISS for ${cacheKey}`);
  return null;
}

function setCachedScores(challengeId: number, statDate: string, scores: any[]): void {
  const cacheKey = `${challengeId}-${statDate}`;
  challengeScoreCache.set(cacheKey, {
    scores,
    timestamp: Date.now()
  });
  console.log(`[ScoreCache] Cached scores for ${cacheKey}`);
}

function invalidateCachedScores(challengeId: number, statDate: string): void {
  const cacheKey = `${challengeId}-${statDate}`;
  challengeScoreCache.delete(cacheKey);
  console.log(`[ScoreCache] Invalidated cache for ${cacheKey}`);
}

// ============================================================================

import {
  calculateWeeklyScores,
  calculateTeamScore,
  calculateDailyChallengeScores,
  buildManufacturerDailyBreakdown,
  buildStrainDailyBreakdown,
  buildPharmacyDailyBreakdown,
  buildBrandDailyBreakdown,
  type BreakdownDetail,
} from './scoringEngine';
import { z } from 'zod';
import { getDb } from './db';
import { 
  weeklyTeamScores, 
  scoringBreakdowns, 
  teams,
  manufacturers,
  cannabisStrains,
  strains,
  pharmacies,
  brands,
  dailyTeamScores,
  dailyScoringBreakdowns,
  weeklyLineups,
  productDailyChallengeStats,
} from '../drizzle/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  mergeLineupWithBreakdowns,
  CHALLENGE_SLOT_ORDER,
  type ChallengeSlotInfo,
  type ChallengeStatBreakdown,
} from './utils/challengeBreakdownHelpers';

export const scoringRouter = router({
  /**
   * Calculate scores for all teams in a league for a specific week
   * Admin or commissioner only
   */
  calculateLeagueWeek: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .mutation(async ({ ctx, input }) => {
      // TODO: Check if user is admin or league commissioner
      if (ctx.user.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      try {
        await calculateWeeklyScores(input.leagueId, input.year, input.week);
        return {
          success: true,
          message: `Scores calculated for league ${input.leagueId}, ${input.year}-W${input.week}`,
        };
      } catch (error) {
        console.error('[Scoring API] Error calculating league scores:', error);
        return {
          success: false,
          message: 'Score calculation failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Calculate scores for a daily challenge date
   * Accessible to all authenticated users
   */
  calculateChallengeDay: protectedProcedure
    .input(z.object({
      challengeId: z.number(),
      statDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .mutation(async ({ ctx, input }) => {
      // Allow all authenticated users to trigger score calculations
      // This enables the "Update Scores Now" button for everyone

      try {
        await calculateDailyChallengeScores(input.challengeId, input.statDate);
        
        // Invalidate cache after recalculation to ensure fresh data
        invalidateCachedScores(input.challengeId, input.statDate);
        
        return {
          success: true,
          message: `Scores calculated for challenge ${input.challengeId} (${input.statDate})`,
        };
      } catch (error) {
        console.error('[Scoring API] Error calculating challenge day scores:', error);
        return {
          success: false,
          message: 'Score calculation failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Calculate score for a single team for a specific week
   * Admin or team owner only
   */
  calculateTeamWeek: protectedProcedure
    .input(z.object({
      teamId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Check if user owns this team or is admin
      const team = await db
        .select()
        .from(teams)
        .where(eq(teams.id, input.teamId))
        .limit(1);

      if (team.length === 0) {
        throw new Error('Team not found');
      }

      if (ctx.user.role !== 'admin' && team[0].userId !== ctx.user.id) {
        throw new Error('Unauthorized: You do not own this team');
      }

      try {
        const totalPoints = await calculateTeamScore(input.teamId, input.year, input.week);
        return {
          success: true,
          totalPoints,
          message: `Score calculated: ${totalPoints} points`,
        };
      } catch (error) {
        console.error('[Scoring API] Error calculating team score:', error);
        return {
          success: false,
          message: 'Score calculation failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Get team score for a specific week
   */
  getTeamScore: protectedProcedure
    .input(z.object({
      teamId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const scores = await db
        .select()
        .from(weeklyTeamScores)
        .where(and(
          eq(weeklyTeamScores.teamId, input.teamId),
          eq(weeklyTeamScores.year, input.year),
          eq(weeklyTeamScores.week, input.week)
        ))
        .limit(1);

      if (scores.length === 0) {
        return null;
      }

      return scores[0];
    }),

  /**
   * Get detailed scoring breakdown for a team's week
   */
  getTeamBreakdown: protectedProcedure
    .input(z.object({
      teamId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get the score record
      const scores = await db
        .select()
        .from(weeklyTeamScores)
        .where(and(
          eq(weeklyTeamScores.teamId, input.teamId),
          eq(weeklyTeamScores.year, input.year),
          eq(weeklyTeamScores.week, input.week)
        ))
        .limit(1);

      if (scores.length === 0) {
        return null;
      }

      const score = scores[0];

      // Get all scoring breakdowns
      const breakdowns = await db
        .select()
        .from(scoringBreakdowns)
        .where(eq(scoringBreakdowns.weeklyTeamScoreId, score.id));

      // Fetch names for each asset type
      const manufacturerIds: number[] = [];
      const strainIds: number[] = [];
      const productIds: number[] = [];
      const pharmacyIds: number[] = [];
      const brandIds: number[] = [];

      breakdowns.forEach((bd) => {
        if (bd.assetType === 'manufacturer') {
          manufacturerIds.push(bd.assetId);
        } else if (bd.assetType === 'cannabis_strain') {
          strainIds.push(bd.assetId);
        } else if (bd.assetType === 'product') {
          productIds.push(bd.assetId);
        } else if (bd.assetType === 'pharmacy') {
          pharmacyIds.push(bd.assetId);
        } else if (bd.assetType === 'brand') {
          brandIds.push(bd.assetId);
        }
      });

      // Debug: Log the IDs we're looking up
      console.log('[getTeamBreakdown] Looking up names for:', {
        manufacturerIds,
        strainIds,
        productIds,
        pharmacyIds,
        brandIds,
      });

      // Fetch names in parallel
      const [manufacturerNames, strainNames, productNames, pharmacyNames, brandNames] = await Promise.all([
        manufacturerIds.length > 0
          ? db.select({ id: manufacturers.id, name: manufacturers.name })
              .from(manufacturers)
              .where(inArray(manufacturers.id, manufacturerIds))
          : [],
        strainIds.length > 0
          ? db.select({ id: cannabisStrains.id, name: cannabisStrains.name })
              .from(cannabisStrains)
              .where(inArray(cannabisStrains.id, strainIds))
          : [],
        productIds.length > 0
          ? db.select({ id: strains.id, name: strains.name })
              .from(strains)
              .where(inArray(strains.id, productIds))
          : [],
        pharmacyIds.length > 0
          ? db.select({ id: pharmacies.id, name: pharmacies.name })
              .from(pharmacies)
              .where(inArray(pharmacies.id, pharmacyIds))
          : [],
        brandIds.length > 0
          ? db.select({ id: brands.id, name: brands.name })
              .from(brands)
              .where(inArray(brands.id, brandIds))
          : [],
      ]);

      // Debug: Log what we found
      console.log('[getTeamBreakdown] Found names:', {
        manufacturerNames: manufacturerNames.map(m => ({ id: m.id, name: m.name })),
        strainNames: strainNames.map(s => ({ id: s.id, name: s.name })),
        productNames: productNames.map(p => ({ id: p.id, name: p.name })),
        pharmacyNames: pharmacyNames.map(p => ({ id: p.id, name: p.name })),
        brandNames: brandNames.map(b => ({ id: b.id, name: b.name })),
      });

      // Create lookup maps
      const nameMap = new Map<number, string>();
      manufacturerNames.forEach((m) => nameMap.set(m.id, m.name));
      strainNames.forEach((s) => nameMap.set(s.id, s.name));
      productNames.forEach((p) => nameMap.set(p.id, p.name));
      pharmacyNames.forEach((p) => nameMap.set(p.id, p.name));
      brandNames.forEach((b) => nameMap.set(b.id, b.name));

      // Enrich breakdowns with asset names
      const enrichedBreakdowns = breakdowns.map((bd) => {
        const name = nameMap.get(bd.assetId);
        // If name not found, create a descriptive fallback
        const fallbackName = name || `${bd.position} (ID: ${bd.assetId})`;
        return {
          ...bd,
          assetName: fallbackName,
        };
      });

      return {
        score,
        breakdowns: enrichedBreakdowns,
      };
    }),

  /**
   * Get team scores for all weeks in a season
   */
  getTeamSeasonScores: protectedProcedure
    .input(z.object({
      teamId: z.number(),
      year: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const scores = await db
        .select()
        .from(weeklyTeamScores)
        .where(and(
          eq(weeklyTeamScores.teamId, input.teamId),
          eq(weeklyTeamScores.year, input.year)
        ));

      return scores;
    }),

  /**
   * Get all team scores for a league in a specific week
   */
  getLeagueWeekScores: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get all teams in the league
      const leagueTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));

      // Get scores for each team
      const teamScores = [];
      for (const team of leagueTeams) {
        const scores = await db
          .select()
          .from(weeklyTeamScores)
          .where(and(
            eq(weeklyTeamScores.teamId, team.id),
            eq(weeklyTeamScores.year, input.year),
            eq(weeklyTeamScores.week, input.week)
          ))
          .limit(1);

        if (scores.length > 0) {
          const { teamId: _, totalPoints, ...scoreData } = scores[0];
          teamScores.push({
            teamId: team.id,
            teamName: team.name,
            points: totalPoints,
            ...scoreData,
          });
        } else {
          teamScores.push({
            teamId: team.id,
            teamName: team.name,
            points: 0,
          });
        }
      }

      return teamScores;
    }),

  /**
   * Get daily challenge scores for a specific date
   */
  getChallengeDayScores: protectedProcedure
    .input(z.object({
      challengeId: z.number(),
      statDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ ctx, input }) => {
      // Check cache first for instant response
      const cachedScores = getCachedScores(input.challengeId, input.statDate);
      if (cachedScores) {
        return cachedScores;
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        console.log(`[Scoring API] getChallengeDayScores - userId: ${ctx.user.id}, challengeId: ${input.challengeId}, statDate: ${input.statDate}`);
        
        // Verify user has access to this challenge (owns a team or is admin)
        let userTeams;
        try {
          userTeams = await db
            .select()
            .from(teams)
            .where(and(
              eq(teams.leagueId, input.challengeId),
              eq(teams.userId, ctx.user.id)
            ))
            .limit(1);
        } catch (error) {
          console.error('[Scoring API] Error checking user access:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to verify access',
            cause: error,
          });
        }

        if (userTeams.length === 0 && ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this challenge',
          });
        }

        const leagueTeams = await db
          .select({
            teamId: teams.id,
            teamName: teams.name,
            userName: users.name,
            userAvatarUrl: users.avatarUrl,
          })
          .from(teams)
          .leftJoin(users, eq(teams.userId, users.id))
          .where(eq(teams.leagueId, input.challengeId));

        const teamScores = [];
        for (const team of leagueTeams) {
          try {
            const scores = await db
              .select()
              .from(dailyTeamScores)
              .where(and(
                eq(dailyTeamScores.teamId, team.teamId),
                eq(dailyTeamScores.challengeId, input.challengeId),
                sql`${dailyTeamScores.statDate} = ${input.statDate}::date`
              ))
              .limit(1);

            if (scores.length > 0) {
              const { teamId: _, totalPoints, ...scoreData } = scores[0];
              teamScores.push({
                teamId: team.teamId,
                teamName: team.teamName,
                userName: team.userName,
                userAvatarUrl: team.userAvatarUrl,
                points: totalPoints,
                ...scoreData,
              });
            } else {
              teamScores.push({
                teamId: team.teamId,
                teamName: team.teamName,
                userName: team.userName,
                userAvatarUrl: team.userAvatarUrl,
                points: 0,
              });
            }
          } catch (error: any) {
            // Try to extract underlying PostgreSQL error
            const pgError = error?.cause || error;
            const errorCode = pgError?.code;
            const errorDetail = pgError?.detail || pgError?.message || error?.message;
            
            console.error(`[Scoring API] Error fetching score for team ${team.id}:`, {
              error: error?.message || String(error),
              stack: error?.stack,
              name: error?.name,
              code: errorCode,
              detail: errorDetail,
              cause: error?.cause,
              challengeId: input.challengeId,
              teamId: team.teamId,
              statDate: input.statDate,
              allProps: Object.keys(error || {}),
            });
            // Continue with other teams even if one fails
            teamScores.push({
              teamId: team.teamId,
              teamName: team.teamName,
              userName: team.userName,
              userAvatarUrl: team.userAvatarUrl,
              points: 0,
            });
          }
        }

        // Cache the results before returning for future requests
        setCachedScores(input.challengeId, input.statDate, teamScores);
        
        return teamScores;
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('[Scoring API] Error in getChallengeDayScores:', {
          error: error?.message || String(error),
          stack: error?.stack,
          name: error?.name,
          code: error?.code,
          userId: ctx.user.id,
          challengeId: input.challengeId,
          statDate: input.statDate,
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Failed to fetch challenge day scores',
          cause: error,
        });
      }
    }),

  /**
   * Get detailed scoring breakdown for a challenge day
   */
  getChallengeDayBreakdown: protectedProcedure
    .input(z.object({
      challengeId: z.number(),
      teamId: z.number(),
      statDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Database not available',
        });
      }

      try {
        console.log(`[Scoring API] getChallengeDayBreakdown - userId: ${ctx.user.id}, challengeId: ${input.challengeId}, teamId: ${input.teamId}, statDate: ${input.statDate}`);
        
        // Verify user has access to this challenge (owns a team or is admin)
        let userTeams;
        try {
          userTeams = await db
            .select()
            .from(teams)
            .where(and(
              eq(teams.leagueId, input.challengeId),
              eq(teams.userId, ctx.user.id)
            ))
            .limit(1);
        } catch (error) {
          console.error('[Scoring API] Error checking user access:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to verify access',
            cause: error,
          });
        }

        if (userTeams.length === 0 && ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this challenge',
          });
        }

        // Verify the team belongs to this challenge
        const team = await db
          .select()
          .from(teams)
          .where(and(
            eq(teams.id, input.teamId),
            eq(teams.leagueId, input.challengeId)
          ))
          .limit(1);

        if (team.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Team not found in this challenge',
          });
        }

        const statDateObj = new Date(`${input.statDate}T00:00:00Z`);
        if (Number.isNaN(statDateObj.getTime())) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid stat date supplied',
          });
        }

        const { year: lineupYear, week: lineupWeek } = getIsoYearWeekParts(statDateObj);

        const lineupRecords = await db
          .select()
          .from(weeklyLineups)
          .where(and(
            eq(weeklyLineups.teamId, input.teamId),
            eq(weeklyLineups.year, lineupYear),
            eq(weeklyLineups.week, lineupWeek)
          ))
          .limit(1);

        const lineupSlots = buildChallengeLineupSlots(lineupRecords[0]);

        let scores;
        try {
          scores = await db
            .select()
            .from(dailyTeamScores)
            .where(and(
              eq(dailyTeamScores.teamId, input.teamId),
              eq(dailyTeamScores.challengeId, input.challengeId),
              sql`${dailyTeamScores.statDate} = ${input.statDate}::date`
            ))
            .limit(1);
        } catch (error: any) {
          // Try to extract underlying PostgreSQL error
          const pgError = error?.cause || error;
          const errorCode = pgError?.code;
          const errorDetail = pgError?.detail || pgError?.message || error?.message;
          
          console.error('[Scoring API] Error fetching daily team scores:', {
            error: error?.message || String(error),
            stack: error?.stack,
            name: error?.name,
            code: errorCode,
            detail: errorDetail,
            cause: error?.cause,
            challengeId: input.challengeId,
            teamId: input.teamId,
            statDate: input.statDate,
            // Log all error properties to help debug
            allProps: Object.keys(error || {}),
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Database query failed: ${errorDetail || error?.message || 'Unknown error'}`,
            cause: error,
          });
        }

        if (scores.length === 0) {
          return null;
        }

        const score = scores[0];

        const rawBreakdowns = await db
          .select()
          .from(dailyScoringBreakdowns)
          .where(eq(dailyScoringBreakdowns.dailyTeamScoreId, score.id));

        const manufacturerIds = new Set<number>();
        const strainIds = new Set<number>();
        const productIds = new Set<number>();
        const pharmacyIds = new Set<number>();
        const brandIds = new Set<number>();

        const collectAssetId = (assetType: string | null | undefined, assetId: number | null | undefined) => {
          if (!assetId) return;
          if (assetType === 'manufacturer') {
            manufacturerIds.add(assetId);
          } else if (assetType === 'cannabis_strain') {
            strainIds.add(assetId);
          } else if (assetType === 'product') {
            productIds.add(assetId);
          } else if (assetType === 'pharmacy') {
            pharmacyIds.add(assetId);
          } else if (assetType === 'brand') {
            brandIds.add(assetId);
          }
        };

        rawBreakdowns.forEach((bd) => collectAssetId(bd.assetType, bd.assetId));
        lineupSlots.forEach((slot) => collectAssetId(slot.assetType, slot.assetId));

        const [manufacturerNames, strainNames, productNames, pharmacyNames, brandNames] = await Promise.all([
          manufacturerIds.size > 0
            ? db.select({ id: manufacturers.id, name: manufacturers.name, imageUrl: manufacturers.logoUrl })
                .from(manufacturers)
                .where(inArray(manufacturers.id, Array.from(manufacturerIds)))
            : [],
          strainIds.size > 0
            ? db.select({ id: cannabisStrains.id, name: cannabisStrains.name, imageUrl: cannabisStrains.imageUrl })
                .from(cannabisStrains)
                .where(inArray(cannabisStrains.id, Array.from(strainIds)))
            : [],
          productIds.size > 0
            ? db.select({ id: strains.id, name: strains.name, imageUrl: sql<string | null>`NULL` })
                .from(strains)
                .where(inArray(strains.id, Array.from(productIds)))
            : [],
          pharmacyIds.size > 0
            ? db.select({ id: pharmacies.id, name: pharmacies.name, imageUrl: pharmacies.logoUrl })
                .from(pharmacies)
                .where(inArray(pharmacies.id, Array.from(pharmacyIds)))
            : [],
          brandIds.size > 0
            ? db.select({ id: brands.id, name: brands.name, imageUrl: brands.logoUrl })
                .from(brands)
                .where(inArray(brands.id, Array.from(brandIds)))
            : [],
        ]);

        const nameMap = new Map<number, string>();
        const imageMap = new Map<number, string | null>();
        manufacturerNames.forEach((m) => { nameMap.set(m.id, m.name); imageMap.set(m.id, m.imageUrl); });
        strainNames.forEach((s) => { nameMap.set(s.id, s.name); imageMap.set(s.id, s.imageUrl); });
        productNames.forEach((p) => { nameMap.set(p.id, p.name); imageMap.set(p.id, p.imageUrl); });
        pharmacyNames.forEach((p) => { nameMap.set(p.id, p.name); imageMap.set(p.id, p.imageUrl); });
        brandNames.forEach((b) => { nameMap.set(b.id, b.name); imageMap.set(b.id, b.imageUrl); });

        lineupSlots.forEach((slot) => {
          if (slot.assetId) {
            slot.assetName = nameMap.get(slot.assetId) ?? slot.assetName ?? null;
          }
        });

        const enrichedBreakdowns = rawBreakdowns.map((bd) => ({
          ...bd,
          assetName: nameMap.get(bd.assetId) || null,
          imageUrl: imageMap.get(bd.assetId) || null,
          breakdown: normalizeDailyBreakdownPayload(bd),
          source: 'stats' as const,
          hasStats: true,
        }));

        const positionPoints = buildPositionPointMap(score);
        const productSupplements = await buildMissingProductBreakdowns({
          db,
          statDate: input.statDate,
          lineupSlots,
          existingPositions: new Set(enrichedBreakdowns.map((bd) => bd.position)),
          positionPoints,
        });
        const completeBreakdowns = mergeLineupWithBreakdowns({
          lineupSlots,
          statBreakdowns: [...enrichedBreakdowns, ...productSupplements],
          fallbackBreakdown: (points) => createNoDataBreakdown(points),
          positionPoints,
          slotOrder: CHALLENGE_SLOT_ORDER,
        });

        return {
          score,
          breakdowns: completeBreakdowns,
        };
      } catch (error: any) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error('[Scoring API] Error in getChallengeDayBreakdown:', {
          error: error?.message || String(error),
          stack: error?.stack,
          name: error?.name,
          code: error?.code,
          userId: ctx.user.id,
          challengeId: input.challengeId,
          teamId: input.teamId,
          statDate: input.statDate,
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error?.message || 'Failed to fetch challenge day breakdown',
          cause: error,
        });
      }
    }),
});

type DailyBreakdownRow = typeof dailyScoringBreakdowns.$inferSelect;
type WeeklyLineupRow = typeof weeklyLineups.$inferSelect;
type DailyScoreRow = typeof dailyTeamScores.$inferSelect;
type ProductDailyStatRow = typeof productDailyChallengeStats.$inferSelect;
type DatabaseClient = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function normalizeDailyBreakdownPayload(bd: DailyBreakdownRow): BreakdownDetail {
  const current = (bd.breakdown ?? null) as BreakdownDetail | Record<string, any> | null;
  if (current && Array.isArray((current as any).components)) {
    return current as BreakdownDetail;
  }

  const raw = (current ?? {}) as Record<string, any>;
  const totalPoints = bd.totalPoints ?? 0;

  if (bd.assetType === 'manufacturer') {
    return buildManufacturerDailyBreakdown({
      salesVolumeGrams: Number(raw.salesVolumeGrams ?? 0),
      orderCount: Number(raw.orderCount ?? 0),
      revenueCents: Number(raw.revenueCents ?? 0),
      rank: raw.rank ?? 0,
      totalPoints,
    }).breakdown;
  }

  if (bd.assetType === 'cannabis_strain' || bd.assetType === 'product') {
    return buildStrainDailyBreakdown({
      salesVolumeGrams: Number(raw.salesVolumeGrams ?? 0),
      orderCount: Number(raw.orderCount ?? 0),
      rank: raw.rank ?? 0,
      totalPoints,
    }).breakdown;
  }

  if (bd.assetType === 'pharmacy') {
    return buildPharmacyDailyBreakdown({
      orderCount: Number(raw.orderCount ?? 0),
      revenueCents: Number(raw.revenueCents ?? 0),
      rank: raw.rank ?? 0,
      totalPoints,
    }).breakdown;
  }

  if (bd.assetType === 'brand') {
    return buildBrandDailyBreakdown({
      totalRatings: Number(raw.totalRatings ?? 0),
      averageRating: raw.averageRating?.toString() ?? '0',
      bayesianAverage: raw.bayesianAverage?.toString() ?? '0',
      veryGoodCount: Number(raw.veryGoodCount ?? 0),
      goodCount: Number(raw.goodCount ?? 0),
      acceptableCount: Number(raw.acceptableCount ?? 0),
      badCount: Number(raw.badCount ?? 0),
      veryBadCount: Number(raw.veryBadCount ?? 0),
      rank: raw.rank ?? 0,
      totalPoints,
    }).breakdown;
  }

  return createNoDataBreakdown(totalPoints);
}

function createNoDataBreakdown(totalPoints: number): BreakdownDetail {
  const detail: BreakdownDetail = {
    components: [
      {
        category: 'No Data',
        value: 0,
        formula: 'No stats available',
        points: 0,
      },
    ],
    bonuses: [],
    penalties: [],
    subtotal: 0,
    total: totalPoints,
  };

  if (totalPoints !== 0) {
    detail.components.push({
      category: 'Score Sync Adjustment',
      value: totalPoints,
      formula: 'Align with stored score',
      points: totalPoints,
    });
    detail.subtotal = totalPoints;
  }

  return detail;
}

function buildChallengeLineupSlots(lineup?: WeeklyLineupRow | undefined): ChallengeSlotInfo[] {
  if (!lineup) {
    return CHALLENGE_SLOT_ORDER.map((slot) => ({
      position: slot.position,
      assetType: slot.assetType,
      assetId: null,
      assetName: null,
    }));
  }

  const slotValues: Record<string, { assetType: string | null; assetId: number | null }> = {
    MFG1: { assetType: 'manufacturer', assetId: lineup.mfg1Id ?? null },
    MFG2: { assetType: 'manufacturer', assetId: lineup.mfg2Id ?? null },
    CSTR1: { assetType: 'cannabis_strain', assetId: lineup.cstr1Id ?? null },
    CSTR2: { assetType: 'cannabis_strain', assetId: lineup.cstr2Id ?? null },
    PRD1: { assetType: 'product', assetId: lineup.prd1Id ?? null },
    PRD2: { assetType: 'product', assetId: lineup.prd2Id ?? null },
    PHM1: { assetType: 'pharmacy', assetId: lineup.phm1Id ?? null },
    PHM2: { assetType: 'pharmacy', assetId: lineup.phm2Id ?? null },
    BRD1: { assetType: 'brand', assetId: lineup.brd1Id ?? null },
    FLEX: { assetType: lineup.flexType ?? null, assetId: lineup.flexId ?? null },
  };

  return CHALLENGE_SLOT_ORDER.map((slot) => {
    const slotOverride = slotValues[slot.position];
    if (!slotOverride) {
      return {
        position: slot.position,
        assetType: slot.assetType,
        assetId: null,
        assetName: null,
      };
    }

    return {
      position: slot.position,
      assetType: slotOverride.assetType ?? slot.assetType ?? null,
      assetId: slotOverride.assetId,
      assetName: null,
    };
  });
}

function buildPositionPointMap(score: DailyScoreRow) {
  return {
    MFG1: score.mfg1Points ?? 0,
    MFG2: score.mfg2Points ?? 0,
    CSTR1: score.cstr1Points ?? 0,
    CSTR2: score.cstr2Points ?? 0,
    PRD1: score.prd1Points ?? 0,
    PRD2: score.prd2Points ?? 0,
    PHM1: score.phm1Points ?? 0,
    PHM2: score.phm2Points ?? 0,
    BRD1: score.brd1Points ?? 0,
    FLEX: score.flexPoints ?? 0,
  };
}

function getIsoYearWeekParts(date: Date): { year: number; week: number } {
  const tempDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = tempDate.getUTCDay() || 7;
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tempDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: tempDate.getUTCFullYear(), week };
}

async function buildMissingProductBreakdowns({
  db,
  statDate,
  lineupSlots,
  existingPositions,
  positionPoints,
}: {
  db: DatabaseClient;
  statDate: string;
  lineupSlots: ChallengeSlotInfo[];
  existingPositions: Set<string>;
  positionPoints: ReturnType<typeof buildPositionPointMap>;
}): Promise<ChallengeStatBreakdown[]> {
  const productPositions = new Set(['PRD1', 'PRD2']);
  const missingSlots = lineupSlots.filter(
    (slot) =>
      productPositions.has(slot.position) &&
      !!slot.assetId &&
      !existingPositions.has(slot.position)
  );

  if (missingSlots.length === 0) {
    return [];
  }

  const uniqueProductIds = Array.from(new Set(missingSlots.map((slot) => slot.assetId!)));

  const productStats = await db
    .select()
    .from(productDailyChallengeStats)
    .where(and(
      inArray(productDailyChallengeStats.productId, uniqueProductIds),
      eq(productDailyChallengeStats.statDate, statDate)
    ));

  const statsByProductId = new Map<number, ProductDailyStatRow>();
  productStats.forEach((stat) => {
    statsByProductId.set(stat.productId, stat);
  });

  return missingSlots.map((slot) => {
    const stat = statsByProductId.get(slot.assetId!);

    if (stat) {
      const productRecord = stat as ProductDailyStatRow;
      const result = buildStrainDailyBreakdown(productRecord);
      return {
        position: slot.position,
        assetType: slot.assetType ?? 'product',
        assetId: slot.assetId,
        assetName: slot.assetName ?? null,
        breakdown: result.breakdown,
        totalPoints: result.points,
        source: 'stats',
        hasStats: true,
      };
    }

    const fallbackPoints = positionPoints[slot.position] ?? 0;
    return {
      position: slot.position,
      assetType: slot.assetType ?? 'product',
      assetId: slot.assetId,
      assetName: slot.assetName ?? null,
      breakdown: createNoDataBreakdown(fallbackPoints),
      totalPoints: fallbackPoints,
      source: 'lineup',
      hasStats: false,
    };
  });
}
