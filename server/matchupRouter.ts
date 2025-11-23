import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { matchups, teams, weeklyTeamScores, leagues } from "../drizzle/schema";
import { eq, and, or, desc, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { autoPopulateLeagueLineups } from "./lineupAutoPopulate";
import { generateSeasonMatchupsForLeague } from "./matchupService";
import { calculateSeasonTeamDailyScore, getScarcityMultipliers } from "./scoringEngine";
import { getWeekDateRange } from "./utils/isoWeek";

/**
 * Matchup Router
 * 
 * Handles:
 * - Weekly matchup generation
 * - Matchup viewing and filtering
 * - Score updates from weekly scoring
 * - Standings calculation
 * - Playoff bracket generation
 */

export const matchupRouter = router({
  /**
   * Generate matchups for a specific week
   * Uses round-robin scheduling to ensure fair matchups
   */
  generateWeekMatchups: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Check if user is league commissioner
      const league = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (league.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'League not found' });
      }

      if (league[0].commissionerUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only commissioner can generate matchups' });
      }

      // Check if matchups already exist for this week
      const existing = await db
        .select()
        .from(matchups)
        .where(and(
          eq(matchups.leagueId, input.leagueId),
          eq(matchups.year, input.year),
          eq(matchups.week, input.week)
        ));

      if (existing.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Matchups already exist for this week' });
      }

      // Get all teams in the league
      const leagueTeams = await db
        .select()
        .from(teams)
        .where(eq(teams.leagueId, input.leagueId))
        .orderBy(teams.id);

      if (leagueTeams.length < 2) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Need at least 2 teams for matchups' });
      }

      // Generate matchups using round-robin algorithm
      const teamCount = leagueTeams.length;
      const matchupsToCreate = [];

      if (teamCount % 2 === 0) {
        // Even number of teams - standard round-robin
        const matchupsPerWeek = teamCount / 2;
        const rotation = (input.week - 1) % (teamCount - 1);

        for (let i = 0; i < matchupsPerWeek; i++) {
          const team1Index = (i + rotation) % teamCount;
          const team2Index = (teamCount - 1 - i + rotation) % teamCount;

          matchupsToCreate.push({
            leagueId: input.leagueId,
            year: input.year,
            week: input.week,
            team1Id: leagueTeams[team1Index].id,
            team2Id: leagueTeams[team2Index].id,
            team1Score: 0,
            team2Score: 0,
            winnerId: null,
            status: 'scheduled' as const,
          });
        }
      } else {
        // Odd number of teams - one team gets a bye
        const rotation = (input.week - 1) % teamCount;
        const byeTeamIndex = rotation;

        for (let i = 0; i < Math.floor(teamCount / 2); i++) {
          let team1Index = (i + rotation + 1) % teamCount;
          let team2Index = (teamCount - 1 - i + rotation) % teamCount;

          // Skip the bye team
          if (team1Index === byeTeamIndex) team1Index = (team1Index + 1) % teamCount;
          if (team2Index === byeTeamIndex) team2Index = (team2Index - 1 + teamCount) % teamCount;

          if (team1Index !== team2Index && team1Index !== byeTeamIndex && team2Index !== byeTeamIndex) {
            matchupsToCreate.push({
              leagueId: input.leagueId,
              year: input.year,
              week: input.week,
              team1Id: leagueTeams[team1Index].id,
              team2Id: leagueTeams[team2Index].id,
              team1Score: 0,
              team2Score: 0,
              winnerId: null,
              status: 'scheduled' as const,
            });
          }
        }
      }

      // Insert matchups
      if (matchupsToCreate.length > 0) {
        await db.insert(matchups).values(matchupsToCreate);
      }

      // Auto-populate lineups for all teams in this week
      try {
        const populateResult = await autoPopulateLeagueLineups(
          input.leagueId,
          input.year,
          input.week
        );
        console.log(
          `[generateWeekMatchups] Auto-populated ${populateResult.lineupsCreated} lineups ` +
          `(${populateResult.lineupsSkipped} skipped, ${populateResult.errors} errors)`
        );
      } catch (error) {
        console.error(`[generateWeekMatchups] Error auto-populating lineups:`, error);
        // Don't fail the entire operation if lineup population fails
      }

      return {
        success: true,
        matchupsCreated: matchupsToCreate.length,
        message: `Generated ${matchupsToCreate.length} matchups for week ${input.week}`,
      };
    }),

  /**
   * Generate matchups for entire regular season
   */
  generateSeasonMatchups: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      startWeek: z.number().min(1),
      endWeek: z.number().max(53),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Check if user is league commissioner
      const league = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (league.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'League not found' });
      }

      if (league[0].commissionerUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only commissioner can generate matchups' });
      }

      try {
        const result = await generateSeasonMatchupsForLeague({
          leagueId: input.leagueId,
          year: input.year,
          startWeek: input.startWeek,
          endWeek: input.endWeek,
          league: league[0],
        });
        return result;
      } catch (error) {
        console.error("[generateSeasonMatchups] Failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to generate season matchups",
        });
      }
    }),

  /**
   * Get matchups for a specific week
   */
  getWeekMatchups: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const [leagueInfo] = await db
        .select({
          status: leagues.status,
          currentWeek: leagues.currentWeek,
          seasonStartDate: leagues.seasonStartDate,
          draftCompleted: leagues.draftCompleted,
        })
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      const now = new Date();
      const seasonStartDate = leagueInfo?.seasonStartDate
        ? new Date(leagueInfo.seasonStartDate)
        : null;
      const hasSeasonStarted = Boolean(
        leagueInfo &&
          (leagueInfo.status === 'active' ||
            leagueInfo.draftCompleted === 1 ||
            (seasonStartDate ? seasonStartDate.getTime() <= now.getTime() : false))
      );
      const isCurrentWeekActive =
        !!leagueInfo &&
        hasSeasonStarted &&
        leagueInfo.currentWeek === input.week;

      const weekMatchups = await db
        .select()
        .from(matchups)
        .where(and(
          eq(matchups.leagueId, input.leagueId),
          eq(matchups.year, input.year),
          eq(matchups.week, input.week)
        ));

      // Get team details for each matchup
      const matchupsWithTeams = await Promise.all(
        weekMatchups.map(async (matchup) => {
          const team1 = await db
            .select()
            .from(teams)
            .where(eq(teams.id, matchup.team1Id))
            .limit(1);

          const team2 = await db
            .select()
            .from(teams)
            .where(eq(teams.id, matchup.team2Id))
            .limit(1);

          return {
            ...matchup,
            status:
              matchup.status === 'final'
                ? 'final'
                : isCurrentWeekActive
                  ? 'in_progress'
                  : matchup.status,
            team1: team1[0],
            team2: team2[0],
          };
        })
      );

      return matchupsWithTeams;
    }),

  /**
   * Get day-by-day scoring totals for each matchup in a given week
   * (season-long leagues only)
   */
  getMatchupDailyScores: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const league = await db
        .select({
          id: leagues.id,
          leagueType: leagues.leagueType,
        })
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (league.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'League not found' });
      }

      if (league[0].leagueType !== 'season') {
        return [];
      }

      const weekMatchups = await db
        .select()
        .from(matchups)
        .where(and(
          eq(matchups.leagueId, input.leagueId),
          eq(matchups.year, input.year),
          eq(matchups.week, input.week)
        ));

      if (weekMatchups.length === 0) {
        return [];
      }

      const { startDate, endDate } = getWeekDateRange(input.year, input.week);
      const weekDates = enumerateWeekDates(startDate, endDate);

      const scarcityMultipliers = await getScarcityMultipliers(db);

      const dailyResults = [];

      for (const matchup of weekMatchups) {
        const dayEntries = [];

        for (const statDate of weekDates) {
          try {
            const [team1Score, team2Score] = await Promise.all([
              calculateSeasonTeamDailyScore({
                teamId: matchup.team1Id,
                year: input.year,
                week: input.week,
                statDate,
                scarcityMultipliers,
              }),
              calculateSeasonTeamDailyScore({
                teamId: matchup.team2Id,
                year: input.year,
                week: input.week,
                statDate,
                scarcityMultipliers,
              }),
            ]);

            dayEntries.push({
              date: statDate,
              team1Points: team1Score.totalPoints || 0,
              team2Points: team2Score.totalPoints || 0,
            });
          } catch (error) {
            console.error('[getMatchupDailyScores] Failed to compute daily score', {
              matchupId: matchup.id,
              statDate,
              error,
            });
            dayEntries.push({
              date: statDate,
              team1Points: 0,
              team2Points: 0,
              error: true,
            });
          }
        }

        dailyResults.push({
          matchupId: matchup.id,
          leagueId: matchup.leagueId,
          year: matchup.year,
          week: matchup.week,
          team1Id: matchup.team1Id,
          team2Id: matchup.team2Id,
          days: dayEntries,
        });
      }

      return dailyResults;
    }),

  /**
   * Update matchup scores from weekly scoring
   * This is called automatically after scoring is complete
   */
  updateMatchupScores: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number().min(1).max(53),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Get all matchups for this week
      const weekMatchups = await db
        .select()
        .from(matchups)
        .where(and(
          eq(matchups.leagueId, input.leagueId),
          eq(matchups.year, input.year),
          eq(matchups.week, input.week)
        ));

      let updated = 0;

      for (const matchup of weekMatchups) {
        // Get scores for both teams
        const team1Scores = await db
          .select()
          .from(weeklyTeamScores)
          .where(and(
            eq(weeklyTeamScores.teamId, matchup.team1Id),
            eq(weeklyTeamScores.year, input.year),
            eq(weeklyTeamScores.week, input.week)
          ))
          .limit(1);

        const team2Scores = await db
          .select()
          .from(weeklyTeamScores)
          .where(and(
            eq(weeklyTeamScores.teamId, matchup.team2Id),
            eq(weeklyTeamScores.year, input.year),
            eq(weeklyTeamScores.week, input.week)
          ))
          .limit(1);

        if (team1Scores.length > 0 && team2Scores.length > 0) {
          const team1Score = team1Scores[0].totalPoints;
          const team2Score = team2Scores[0].totalPoints;
          const winnerId = team1Score > team2Score ? matchup.team1Id :
                          team2Score > team1Score ? matchup.team2Id : null;

          await db
            .update(matchups)
            .set({
              team1Score,
              team2Score,
              winnerId,
              status: 'final',
            })
            .where(eq(matchups.id, matchup.id));

          updated++;
        }
      }

      return {
        success: true,
        matchupsUpdated: updated,
        message: `Updated ${updated} matchups with final scores`,
      };
    }),

  /**
   * Get team's matchup history
   */
  getTeamMatchups: protectedProcedure
    .input(z.object({
      teamId: z.number(),
      year: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const teamMatchups = await db
        .select()
        .from(matchups)
        .where(and(
          or(
            eq(matchups.team1Id, input.teamId),
            eq(matchups.team2Id, input.teamId)
          ),
          eq(matchups.year, input.year)
        ))
        .orderBy(asc(matchups.week));

      // Get opponent details for each matchup
      const matchupsWithOpponents = await Promise.all(
        teamMatchups.map(async (matchup) => {
          const isTeam1 = matchup.team1Id === input.teamId;
          const opponentId = isTeam1 ? matchup.team2Id : matchup.team1Id;

          const opponent = await db
            .select()
            .from(teams)
            .where(eq(teams.id, opponentId))
            .limit(1);

          return {
            ...matchup,
            isTeam1,
            opponentId,
            opponent: opponent[0],
            teamScore: isTeam1 ? matchup.team1Score : matchup.team2Score,
            opponentScore: isTeam1 ? matchup.team2Score : matchup.team1Score,
            isWin: matchup.winnerId === input.teamId,
            isLoss: matchup.winnerId !== null && matchup.winnerId !== input.teamId,
            isTie: matchup.winnerId === null && matchup.status === 'final',
          };
        })
      );

      return matchupsWithOpponents;
    }),
});

function enumerateWeekDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}
