/**
 * Scoring tRPC Router
 * 
 * Provides API endpoints for scoring operations and viewing scoring breakdowns.
 */

import { router, protectedProcedure } from './_core/trpc';
import { calculateWeeklyScores, calculateTeamScore } from './scoringEngine';
import { z } from 'zod';
import { getDb } from './db';
import { 
  weeklyTeamScores, 
  scoringBreakdowns, 
  teams,
  manufacturers,
  cannabisStrains,
  pharmacies,
  brands,
} from '../drizzle/schema';
import { eq, and, inArray } from 'drizzle-orm';

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
      const pharmacyIds: number[] = [];
      const brandIds: number[] = [];

      breakdowns.forEach((bd) => {
        if (bd.assetType === 'manufacturer') {
          manufacturerIds.push(bd.assetId);
        } else if (bd.assetType === 'cannabis_strain') {
          strainIds.push(bd.assetId);
        } else if (bd.assetType === 'pharmacy') {
          pharmacyIds.push(bd.assetId);
        } else if (bd.assetType === 'brand') {
          brandIds.push(bd.assetId);
        }
      });

      // Fetch names in parallel
      const [manufacturerNames, strainNames, pharmacyNames, brandNames] = await Promise.all([
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

      // Create lookup maps
      const nameMap = new Map<number, string>();
      manufacturerNames.forEach((m) => nameMap.set(m.id, m.name));
      strainNames.forEach((s) => nameMap.set(s.id, s.name));
      pharmacyNames.forEach((p) => nameMap.set(p.id, p.name));
      brandNames.forEach((b) => nameMap.set(b.id, b.name));

      // Enrich breakdowns with asset names
      const enrichedBreakdowns = breakdowns.map((bd) => ({
        ...bd,
        assetName: nameMap.get(bd.assetId) || null,
      }));

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
          teamScores.push({
            teamId: team.id,
            teamName: team.name,
            points: scores[0].totalPoints,
            ...scores[0],
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
});
