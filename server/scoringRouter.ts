/**
 * Scoring tRPC Router
 * 
 * Provides API endpoints for scoring operations and viewing scoring breakdowns.
 */

import { router, protectedProcedure } from './_core/trpc';
import { scoreBroadcaster } from './scoreBroadcaster';

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
  calculateSeasonTeamWeek,
  calculateDailyChallengeScores,
  buildManufacturerDailyBreakdown,
  buildStrainDailyBreakdown,
  buildPharmacyDailyBreakdown,
  buildBrandDailyBreakdown,
  type BreakdownDetail,
} from './scoringEngine';
import {
  buildManufacturerTrendBreakdown,
  buildStrainTrendBreakdown,
  buildPharmacyTrendBreakdown,
  buildProductTrendBreakdown,
} from './trendScoringBreakdowns';
import {
  calculateManufacturerTrendScore,
  calculateStrainTrendScore,
  calculateProductTrendScore,
  calculatePharmacyTrendScore,
  type TrendScoringStats,
} from './trendScoringEngine';
import { z } from 'zod';
import { getDb } from './db';
import {
  weeklyTeamScores,
  scoringBreakdowns,
  teams,
  users,
  manufacturers,
  cannabisStrains,
  strains,
  pharmacies,
  brands,
  dailyTeamScores,
  dailyScoringBreakdowns,
  weeklyLineups,
  productDailyChallengeStats,
  leagues,
  userPredictions,
} from '../drizzle/schema';
import {
  manufacturerDailyChallengeStats,
  strainDailyChallengeStats,
  pharmacyDailyChallengeStats,
  brandDailyChallengeStats,
} from '../drizzle/dailyChallengeSchema';
import { eq, and, inArray, sql, gte, lte, desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  mergeLineupWithBreakdowns,
  CHALLENGE_SLOT_ORDER,
  type ChallengeSlotInfo,
  type ChallengeStatBreakdown,
} from './utils/challengeBreakdownHelpers';
import { getWeekDateRange } from './utils/isoWeek';

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
      // Check if user is admin or league commissioner
      if (ctx.user.role !== 'admin') {
        const db = await getDb();
        if (!db) throw new Error('Database not available');

        const league = await db
          .select()
          .from(leagues)
          .where(eq(leagues.id, input.leagueId))
          .limit(1);

        if (!league.length || league[0].commissionerUserId !== ctx.user.id) {
          throw new Error('Unauthorized: Admin or Commissioner access required');
        }
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

        // Broadcast scoring plays via WebSocket for real-time updates
        // The broadcaster has sanity checks to prevent wrong delta values
        // and will skip broadcasting on first run (establishing baseline)
        let playCount = 0;
        try {
          playCount = await scoreBroadcaster.detectAndQueuePlays(
            input.challengeId,
            input.statDate,
            5 // spread over 5 minutes
          );
        } catch (broadcastError) {
          console.error('[Scoring API] Broadcaster error (non-fatal):', broadcastError);
          // Continue - scores were calculated, just no real-time updates
        }

        return {
          success: true,
          message: `Scores calculated for challenge ${input.challengeId} (${input.statDate})`,
          playsQueued: playCount,
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
        const totalPoints = await calculateSeasonTeamWeek(team[0].leagueId, input.teamId, input.year, input.week);
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
      let scores = await db
        .select()
        .from(weeklyTeamScores)
        .where(and(
          eq(weeklyTeamScores.teamId, input.teamId),
          eq(weeklyTeamScores.year, input.year),
          eq(weeklyTeamScores.week, input.week)
        ))
        .limit(1);

      // If no weekly score exists yet, build a \"live\" weekly score on the fly
      // using the same daily stats that power live scoring.
      if (scores.length === 0) {
        // Look up the league for this team so we can run a single-team weekly scoring pass
        const teamLeague = await db
          .select({ leagueId: teams.leagueId })
          .from(teams)
          .where(eq(teams.id, input.teamId))
          .limit(1);

        if (teamLeague.length === 0) {
          return null;
        }

        try {
          // This computes and persists a weeklyTeamScores row (and breakdowns) for just this team
          await calculateSeasonTeamWeek(
            teamLeague[0].leagueId,
            input.teamId,
            input.year,
            input.week
          );

          // Re-load the freshly created score
          scores = await db
            .select()
            .from(weeklyTeamScores)
            .where(and(
              eq(weeklyTeamScores.teamId, input.teamId),
              eq(weeklyTeamScores.year, input.year),
              eq(weeklyTeamScores.week, input.week)
            ))
            .limit(1);
        } catch (error) {
          console.error('[getTeamBreakdown] Error computing live weekly score:', error);
          return null;
        }

        if (scores.length === 0) {
          return null;
        }
      }

      const score = scores[0];

      // Get all scoring breakdowns
      const breakdowns = await db
        .select()
        .from(scoringBreakdowns)
        .where(eq(scoringBreakdowns.weeklyTeamScoreId, score.id));

      const uniqueBreakdownsMap = new Map<string, typeof breakdowns[number]>();
      breakdowns.forEach((bd) => {
        const key = `${bd.position}-${bd.assetType}-${bd.assetId ?? 'na'}`;
        const existing = uniqueBreakdownsMap.get(key);
        if (!existing || bd.id > existing.id) {
          uniqueBreakdownsMap.set(key, bd);
        }
      });
      const uniqueBreakdowns = Array.from(uniqueBreakdownsMap.values());

      // Fetch names for each asset type
      const manufacturerIds = new Set<number>();
      const strainIds = new Set<number>();
      const productIds = new Set<number>();
      const pharmacyIds = new Set<number>();
      const brandIds = new Set<number>();

      uniqueBreakdowns.forEach((bd) => {
        if (!bd.assetId) return;
        if (bd.assetType === 'manufacturer') {
          manufacturerIds.add(bd.assetId);
        } else if (bd.assetType === 'cannabis_strain') {
          strainIds.add(bd.assetId);
        } else if (bd.assetType === 'product') {
          productIds.add(bd.assetId);
        } else if (bd.assetType === 'pharmacy') {
          pharmacyIds.add(bd.assetId);
        } else if (bd.assetType === 'brand') {
          brandIds.add(bd.assetId);
        }
      });

      // Debug: Log the IDs we're looking up
      console.log('[getTeamBreakdown] Looking up names for:', {
        manufacturerIds: Array.from(manufacturerIds),
        strainIds: Array.from(strainIds),
        productIds: Array.from(productIds),
        pharmacyIds: Array.from(pharmacyIds),
        brandIds: Array.from(brandIds),
      });

      // Fetch names (and logos) in parallel
      const [
        manufacturerEntities,
        strainEntities,
        productEntities,
        pharmacyEntities,
        brandEntities,
      ] = await Promise.all([
        manufacturerIds.size > 0
          ? db.select({
            id: manufacturers.id,
            name: manufacturers.name,
            imageUrl: manufacturers.logoUrl,
          })
            .from(manufacturers)
            .where(inArray(manufacturers.id, Array.from(manufacturerIds)))
          : [],
        strainIds.size > 0
          ? db.select({
            id: cannabisStrains.id,
            name: cannabisStrains.name,
            imageUrl: cannabisStrains.imageUrl,
          })
            .from(cannabisStrains)
            .where(inArray(cannabisStrains.id, Array.from(strainIds)))
          : [],
        productIds.size > 0
          ? db.select({
            id: strains.id,
            name: strains.name,
            imageUrl: sql<string | null>`NULL`,
          })
            .from(strains)
            .where(inArray(strains.id, Array.from(productIds)))
          : [],
        pharmacyIds.size > 0
          ? db.select({
            id: pharmacies.id,
            name: pharmacies.name,
            imageUrl: pharmacies.logoUrl,
          })
            .from(pharmacies)
            .where(inArray(pharmacies.id, Array.from(pharmacyIds)))
          : [],
        brandIds.size > 0
          ? db.select({
            id: brands.id,
            name: brands.name,
            imageUrl: brands.logoUrl,
          })
            .from(brands)
            .where(inArray(brands.id, Array.from(brandIds)))
          : [],
      ]);

      // Debug: Log what we found
      console.log('[getTeamBreakdown] Found names:', {
        manufacturerNames: manufacturerEntities.map((m) => ({ id: m.id, name: m.name })),
        strainNames: strainEntities.map((s) => ({ id: s.id, name: s.name })),
        productNames: productEntities.map((p) => ({ id: p.id, name: p.name })),
        pharmacyNames: pharmacyEntities.map((p) => ({ id: p.id, name: p.name })),
        brandNames: brandEntities.map((b) => ({ id: b.id, name: b.name })),
      });

      // Create lookup maps
      const nameMap = new Map<number, string>();
      const imageMap = new Map<number, string | null>();
      manufacturerEntities.forEach((m) => {
        nameMap.set(m.id, m.name);
        imageMap.set(m.id, m.imageUrl ?? null);
      });
      strainEntities.forEach((s) => {
        nameMap.set(s.id, s.name);
        imageMap.set(s.id, s.imageUrl ?? null);
      });
      productEntities.forEach((p) => {
        nameMap.set(p.id, p.name);
        imageMap.set(p.id, p.imageUrl ?? null);
      });
      pharmacyEntities.forEach((p) => {
        nameMap.set(p.id, p.name);
        imageMap.set(p.id, p.imageUrl ?? null);
      });
      brandEntities.forEach((b) => {
        nameMap.set(b.id, b.name);
        imageMap.set(b.id, b.imageUrl ?? null);
      });

      // Enrich breakdowns with asset names
      const enrichedBreakdowns = uniqueBreakdowns.map((bd) => {
        const name = bd.assetId ? nameMap.get(bd.assetId) : null;
        // If name not found, create a descriptive fallback
        const fallbackName = name || `${bd.position} (ID: ${bd.assetId})`;
        return {
          ...bd,
          assetName: fallbackName,
          imageUrl: bd.assetId ? imageMap.get(bd.assetId) ?? null : null,
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
   * Get live cumulative scores for the current week
   * Aggregates daily stats for all teams in the league
   */
  getLeagueLiveScores: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Calculate date range for the week
      const { startDate, endDate } = getWeekDateRange(input.year, input.week);

      // Get all teams in the league
      const leagueTeams = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId));

      const teamScores = [];

      // For each team, calculate score from DAILY stats
      for (const team of leagueTeams) {
        // Get team's lineup for this week
        const lineup = await db
          .select()
          .from(weeklyLineups)
          .where(and(
            eq(weeklyLineups.teamId, team.id),
            eq(weeklyLineups.year, input.year),
            eq(weeklyLineups.week, input.week)
          ))
          .limit(1);

        let totalPoints = 0;

        if (lineup.length > 0) {
          const l = lineup[0];
          const assetIds = [
            { type: 'manufacturer', id: l.mfg1Id },
            { type: 'manufacturer', id: l.mfg2Id },
            { type: 'cannabis_strain', id: l.cstr1Id },
            { type: 'cannabis_strain', id: l.cstr2Id },
            { type: 'product', id: l.prd1Id },
            { type: 'product', id: l.prd2Id },
            { type: 'pharmacy', id: l.phm1Id },
            { type: 'pharmacy', id: l.phm2Id },
            { type: 'brand', id: l.brd1Id },
            { type: l.flexType, id: l.flexId }
          ].filter(a => a.id !== null);

          // Aggregate points for each asset from daily stats tables
          for (const asset of assetIds) {
            if (!asset.type || !asset.id) continue;

            let table;
            let idCol;
            switch (asset.type) {
              case 'manufacturer': table = manufacturerDailyChallengeStats; idCol = manufacturerDailyChallengeStats.manufacturerId; break;
              case 'cannabis_strain': table = strainDailyChallengeStats; idCol = strainDailyChallengeStats.strainId; break;
              case 'product': table = productDailyChallengeStats; idCol = productDailyChallengeStats.productId; break;
              case 'pharmacy': table = pharmacyDailyChallengeStats; idCol = pharmacyDailyChallengeStats.pharmacyId; break;
              case 'brand': table = brandDailyChallengeStats; idCol = brandDailyChallengeStats.brandId; break;
            }

            if (table && idCol) {
              const stats = await db
                .select({ points: table.totalPoints })
                .from(table)
                .where(and(
                  eq(idCol, asset.id),
                  gte(table.statDate, startDate),
                  lte(table.statDate, endDate)
                ));

              const assetTotal = stats.reduce((sum, s) => sum + (s.points || 0), 0);
              totalPoints += assetTotal;
            }
          }
        }

        teamScores.push({
          teamId: team.id,
          teamName: team.name,
          points: totalPoints
        });
      }

      return teamScores.sort((a, b) => b.points - a.points).map((s, i) => ({ ...s, rank: i + 1 }));
    }),

  /**
   * Get live activity feed for the dashboard
   * Combines recent user predictions and top daily stats
   */
  getLiveActivityFeed: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const today = new Date().toISOString().split('T')[0];

      // 1. Fetch recent predictions
      const recentPredictions = await db
        .select({
          id: userPredictions.id,
          userName: users.name,
          userAvatar: users.avatarUrl,
          matchupId: userPredictions.matchupId,
          timestamp: userPredictions.submittedAt,
        })
        .from(userPredictions)
        .leftJoin(users, eq(userPredictions.userId, users.id))
        .where(sql`DATE(${userPredictions.submittedAt}) = ${today}`)
        .orderBy(desc(userPredictions.submittedAt))
        .limit(5);

      // 2. Fetch top manufacturer of the day
      const topManufacturer = await db
        .select({
          name: manufacturers.name,
          points: manufacturerDailyChallengeStats.totalPoints,
        })
        .from(manufacturerDailyChallengeStats)
        .leftJoin(manufacturers, eq(manufacturerDailyChallengeStats.manufacturerId, manufacturers.id))
        .where(eq(manufacturerDailyChallengeStats.statDate, today))
        .orderBy(desc(manufacturerDailyChallengeStats.totalPoints))
        .limit(1);

      // 3. Fetch top strain of the day
      const topStrain = await db
        .select({
          name: cannabisStrains.name,
          points: strainDailyChallengeStats.totalPoints,
        })
        .from(strainDailyChallengeStats)
        .leftJoin(cannabisStrains, eq(strainDailyChallengeStats.strainId, cannabisStrains.id))
        .where(eq(strainDailyChallengeStats.statDate, today))
        .orderBy(desc(strainDailyChallengeStats.totalPoints))
        .limit(1);

      const feedItems = [];

      // Add predictions
      for (const pred of recentPredictions) {
        feedItems.push({
          id: `pred-${pred.id}`,
          type: 'prediction',
          message: `${pred.userName || 'Someone'} just locked in a prediction!`,
          timestamp: pred.timestamp,
          icon: pred.userAvatar,
        });
      }

      // Add stats if available
      if (topManufacturer.length > 0) {
        feedItems.push({
          id: `stat-mfg-${today}`,
          type: 'stat_manufacturer',
          message: `${topManufacturer[0].name} is leading Manufacturers with ${topManufacturer[0].points} pts`,
          timestamp: new Date().toISOString(), // approximate
          icon: null,
        });
      }

      if (topStrain.length > 0) {
        feedItems.push({
          id: `stat-str-${today}`,
          type: 'stat_strain',
          message: `${topStrain[0].name} is the top Flower today with ${topStrain[0].points} pts`,
          timestamp: new Date().toISOString(), // approximate
          icon: null,
        });
      }

      // Sort by timestamp descending
      return feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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

        // Fetch actual stat records from challenge stats tables
        const [manufacturerStats, strainStats, productStats, pharmacyStats] = await Promise.all([
          manufacturerIds.size > 0
            ? db.select()
              .from(manufacturerDailyChallengeStats)
              .where(and(
                inArray(manufacturerDailyChallengeStats.manufacturerId, Array.from(manufacturerIds)),
                sql`${manufacturerDailyChallengeStats.statDate} = ${input.statDate}::date`
              ))
            : [],
          strainIds.size > 0
            ? db.select()
              .from(strainDailyChallengeStats)
              .where(and(
                inArray(strainDailyChallengeStats.strainId, Array.from(strainIds)),
                sql`${strainDailyChallengeStats.statDate} = ${input.statDate}::date`
              ))
            : [],
          productIds.size > 0
            ? db.select()
              .from(productDailyChallengeStats)
              .where(and(
                inArray(productDailyChallengeStats.productId, Array.from(productIds)),
                sql`${productDailyChallengeStats.statDate} = ${input.statDate}::date`
              ))
            : [],
          pharmacyIds.size > 0
            ? db.select()
              .from(pharmacyDailyChallengeStats)
              .where(and(
                inArray(pharmacyDailyChallengeStats.pharmacyId, Array.from(pharmacyIds)),
                sql`${pharmacyDailyChallengeStats.statDate} = ${input.statDate}::date`
              ))
            : [],
        ]);

        let brandStats: typeof brandDailyChallengeStats.$inferSelect[] = [];
        if (brandIds.size > 0) {
          try {
            brandStats = await db
              .select()
              .from(brandDailyChallengeStats)
              .where(and(
                inArray(brandDailyChallengeStats.brandId, Array.from(brandIds)),
                sql`${brandDailyChallengeStats.statDate} = ${input.statDate}::date`
              ));
          } catch (error: any) {
            console.error('[Scoring API] Error fetching brand daily stats:', {
              error: error?.message || String(error),
              stack: error?.stack,
              name: error?.name,
              code: error?.code,
              challengeId: input.challengeId,
              teamId: input.teamId,
              statDate: input.statDate,
            });
            brandStats = [];
          }
        }

        // Create maps for quick lookup
        const manufacturerStatMap = new Map(manufacturerStats.map(s => [s.manufacturerId, s]));
        const strainStatMap = new Map(strainStats.map(s => [s.strainId, s]));
        const productStatMap = new Map(productStats.map(s => [s.productId, s]));
        const pharmacyStatMap = new Map(pharmacyStats.map(s => [s.pharmacyId, s]));
        const brandStatMap = new Map(brandStats.map(s => [s.brandId, s]));

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

        const enrichedBreakdowns = rawBreakdowns.map((bd) => {
          // Get the stat record based on asset type
          let statRecord: StatRecord | undefined;
          if (bd.assetType === 'manufacturer' && bd.assetId) {
            statRecord = manufacturerStatMap.get(bd.assetId);
          } else if (bd.assetType === 'cannabis_strain' && bd.assetId) {
            statRecord = strainStatMap.get(bd.assetId);
          } else if (bd.assetType === 'product' && bd.assetId) {
            statRecord = productStatMap.get(bd.assetId);
          } else if (bd.assetType === 'pharmacy' && bd.assetId) {
            statRecord = pharmacyStatMap.get(bd.assetId);
          } else if (bd.assetType === 'brand' && bd.assetId) {
            statRecord = brandStatMap.get(bd.assetId);
          }

          return {
            ...bd,
            assetName: nameMap.get(bd.assetId) || null,
            imageUrl: imageMap.get(bd.assetId) || null,
            breakdown: normalizeDailyBreakdownPayload(bd, statRecord),
            source: 'stats' as const,
            hasStats: true,
          };
        });

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

type StatRecord = {
  trendMultiplier?: string | number | null;
  streakDays?: number | null;
  consistencyScore?: string | number | null;
  velocityScore?: string | number | null;
  marketSharePercent?: string | number | null;
  orderCount?: number | null;
  rank?: number | null;
  previousRank?: number | null;
  salesVolumeGrams?: number | null;
  revenueCents?: number | null;
  // Brand-specific fields
  totalRatings?: number | null;
  averageRating?: string | number | null;
  bayesianAverage?: string | number | null;
  veryGoodCount?: number | null;
  goodCount?: number | null;
  acceptableCount?: number | null;
  badCount?: number | null;
  veryBadCount?: number | null;
};

export function normalizeDailyBreakdownPayload(bd: DailyBreakdownRow, statRecord?: StatRecord): BreakdownDetail {
  const current = (bd.breakdown ?? null) as BreakdownDetail | Record<string, any> | null;
  const raw = (current ?? {}) as Record<string, any>;
  const totalPoints = bd.totalPoints ?? 0;

  // Use stat record if provided, otherwise fall back to old breakdown JSON
  const data = statRecord ?? raw;

  // Calculate the base breakdown from stats
  let result: BreakdownDetail;

  if (bd.assetType === 'manufacturer') {
    const orderCount = Number(data.orderCount ?? 0);
    const rank = data.rank ?? 0;
    const previousRank = data.previousRank ?? rank;
    const streakDays = Number(data.streakDays ?? 0);

    const scoring = calculateManufacturerTrendScore({
      orderCount,
      days1: 0,
      days7: 0,
      currentRank: rank,
      previousRank,
      consistencyScore: Number(data.consistencyScore ?? 0),
      velocityScore: Number(data.velocityScore ?? 0),
      streakDays,
      marketSharePercent: Number(data.marketSharePercent ?? 0),
      trendMultiplier: Number(data.trendMultiplier ?? 0) || undefined,
    });

    result = buildManufacturerTrendBreakdown(
      scoring,
      orderCount,
      rank,
      previousRank,
      streakDays
    ).breakdown;
  } else if (bd.assetType === 'cannabis_strain' || bd.assetType === 'product') {
    const orderCount = Number(data.orderCount ?? 0);
    const rank = data.rank ?? 0;
    const previousRank = data.previousRank ?? rank;
    const streakDays = Number(data.streakDays ?? 0);

    const scoreCalculator = bd.assetType === 'product' ? calculateProductTrendScore : calculateStrainTrendScore;
    const scoring = scoreCalculator({
      orderCount,
      days1: 0,
      days7: 0,
      currentRank: rank,
      previousRank,
      consistencyScore: Number(data.consistencyScore ?? 0),
      velocityScore: Number(data.velocityScore ?? 0),
      streakDays,
      marketSharePercent: Number(data.marketSharePercent ?? 0),
      trendMultiplier: Number(data.trendMultiplier ?? 0) || undefined,
    } as TrendScoringStats);

    const builder = bd.assetType === 'product' ? buildProductTrendBreakdown : buildStrainTrendBreakdown;
    result = builder(
      scoring,
      orderCount,
      rank,
      previousRank,
      streakDays
    ).breakdown;
  } else if (bd.assetType === 'pharmacy') {
    const orderCount = Number(data.orderCount ?? 0);
    const rank = data.rank ?? 0;
    const previousRank = data.previousRank ?? rank;
    const streakDays = Number(data.streakDays ?? 0);

    const scoring = calculatePharmacyTrendScore({
      orderCount,
      days1: 0,
      days7: 0,
      currentRank: rank,
      previousRank,
      consistencyScore: Number(data.consistencyScore ?? 0),
      velocityScore: Number(data.velocityScore ?? 0),
      streakDays,
      marketSharePercent: Number(data.marketSharePercent ?? 0),
      trendMultiplier: Number(data.trendMultiplier ?? 0) || undefined,
    } as TrendScoringStats);

    result = buildPharmacyTrendBreakdown(
      scoring,
      orderCount,
      rank,
      previousRank,
      streakDays
    ).breakdown;
  } else if (bd.assetType === 'brand') {
    result = buildBrandDailyBreakdown({
      totalRatings: Number(data.totalRatings ?? 0),
      averageRating: data.averageRating?.toString() ?? '0',
      bayesianAverage: data.bayesianAverage?.toString() ?? '0',
      veryGoodCount: Number(data.veryGoodCount ?? 0),
      goodCount: Number(data.goodCount ?? 0),
      acceptableCount: Number(data.acceptableCount ?? 0),
      badCount: Number(data.badCount ?? 0),
      veryBadCount: Number(data.veryBadCount ?? 0),
      rank: data.rank ?? 0,
      totalPoints,
    }).breakdown;
  } else {
    result = createNoDataBreakdown(totalPoints);
  }

  // Preserve special bonuses (Captain Boost, Fan Buff) from the persisted breakdown
  // These are applied at the team level, not the asset level, so they aren't recalculated by the builders above
  
  // Handle case where bd.breakdown might be a string (JSON not auto-parsed) or an object
  let parsedBreakdown: BreakdownDetail | Record<string, any> | null = current;
  if (typeof bd.breakdown === 'string') {
    try {
      parsedBreakdown = JSON.parse(bd.breakdown);
    } catch (e) {
      console.warn('[normalizeDailyBreakdownPayload] Failed to parse breakdown JSON string:', e);
      parsedBreakdown = null;
    }
  }
  
  // Extract bonuses array from the persisted breakdown
  const persistedBonuses = parsedBreakdown?.bonuses;
  
  if (persistedBonuses && Array.isArray(persistedBonuses)) {
    const specialBonuses = persistedBonuses.filter((b: any) =>
      b.type === 'captain_boost' ||
      b.type === 'Captain Boost' ||
      b.type === 'Fan Buff' ||
      b.type === 'fan_buff' ||
      b.type === 'Synergy Bonus' ||
      b.type === 'synergy_bonus' ||
      b.type === 'Full Synergy Bonus' ||
      b.type === 'full_synergy_bonus' ||
      b.type === 'first_goal_bonus' ||
      b.type === 'First Goal Bonus ⚽' ||
      b.type?.includes?.('First Goal')
    );

    if (specialBonuses.length > 0) {
      result.bonuses.push(...specialBonuses);
      // Add the bonus points to the total
      const bonusPoints = specialBonuses.reduce((sum: number, b: any) => sum + (b.points || 0), 0);
      result.total += bonusPoints;
      console.log(`[normalizeDailyBreakdownPayload] Preserved ${specialBonuses.length} special bonus(es) for ${bd.assetType} #${bd.assetId}:`, 
        specialBonuses.map((b: any) => `${b.type}: +${b.points}`).join(', '));
    }
  } else if (parsedBreakdown && parsedBreakdown.bonuses !== undefined) {
    // Log if bonuses exists but isn't an array - helps debug type issues
    console.warn(`[normalizeDailyBreakdownPayload] Unexpected bonuses type for ${bd.assetType} #${bd.assetId}:`, 
      typeof parsedBreakdown.bonuses, parsedBreakdown.bonuses);
  }

  // CRITICAL: Use the server-calculated totalPoints from the database, not the recalculated value.
  // The recalculated breakdown above is for display purposes (showing components, bonuses breakdown),
  // but the actual total must match what was stored in dailyScoringBreakdowns.totalPoints to ensure
  // the sum of player cards equals the grand total in dailyTeamScores.totalPoints.
  if (totalPoints > 0) {
    result.total = totalPoints;
    result.subtotal = totalPoints;
  }

  return result;
}

function createNoDataBreakdown(totalPoints: number): BreakdownDetail {
  return {
    components: [],
    bonuses: [],
    penalties: [],
    subtotal: 0,
    total: 0,
  };
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
