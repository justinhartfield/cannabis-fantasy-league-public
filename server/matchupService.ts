import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { leagues, matchups, teams } from "../drizzle/schema";
import { autoPopulateLeagueLineups } from "./lineupAutoPopulate";

type LeagueRow = typeof leagues.$inferSelect;

export interface GenerateSeasonMatchupsParams {
  leagueId: number;
  year: number;
  startWeek: number;
  endWeek: number;
  league?: LeagueRow;
}

export interface GenerateSeasonMatchupsResult {
  success: boolean;
  totalMatchups: number;
  errors: Array<{ week: number; error: string }>;
  message: string;
}

/**
 * Generates season-long matchups using the same round-robin logic as the TRPC mutation,
 * but available for internal server workflows (e.g., auto-generation after draft).
 */
export async function generateSeasonMatchupsForLeague(
  params: GenerateSeasonMatchupsParams
): Promise<GenerateSeasonMatchupsResult> {
  const { leagueId, year, startWeek, endWeek } = params;
  if (startWeek > endWeek) {
    throw new Error("startWeek cannot be greater than endWeek");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  let league = params.league;
  if (!league) {
    const result = await db
      .select()
      .from(leagues)
      .where(eq(leagues.id, leagueId))
      .limit(1);
    league = result[0];
  }

  if (!league) {
    throw new Error("League not found");
  }

  const leagueTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.leagueId, leagueId))
    .orderBy(teams.id);

  const teamCount = leagueTeams.length;
  if (teamCount < 2) {
    return {
      success: true,
      totalMatchups: 0,
      errors: [],
      message: "Not enough teams to generate matchups",
    };
  }

  let totalMatchups = 0;
  const errors: Array<{ week: number; error: string }> = [];

  for (let week = startWeek; week <= endWeek; week++) {
    try {
      const existing = await db
        .select({ id: matchups.id })
        .from(matchups)
        .where(
          and(
            eq(matchups.leagueId, leagueId),
            eq(matchups.year, year),
            eq(matchups.week, week)
          )
        );

      if (existing.length > 0) {
        continue;
      }

      const matchupsToCreate: Array<typeof matchups.$inferInsert> = [];

      if (teamCount % 2 === 0) {
        const matchupsPerWeek = teamCount / 2;
        const rotation = (week - 1) % (teamCount - 1);

        for (let i = 0; i < matchupsPerWeek; i++) {
          const team1Index = (i + rotation) % teamCount;
          const team2Index = (teamCount - 1 - i + rotation) % teamCount;

          matchupsToCreate.push({
            leagueId,
            year,
            week,
            team1Id: leagueTeams[team1Index].id,
            team2Id: leagueTeams[team2Index].id,
            team1Score: 0,
            team2Score: 0,
            winnerId: null,
            status: "scheduled",
          });
        }
      } else {
        const rotation = (week - 1) % teamCount;
        const byeTeamIndex = rotation;

        for (let i = 0; i < Math.floor(teamCount / 2); i++) {
          let team1Index = (i + rotation + 1) % teamCount;
          let team2Index = (teamCount - 1 - i + rotation) % teamCount;

          if (team1Index === byeTeamIndex) team1Index = (team1Index + 1) % teamCount;
          if (team2Index === byeTeamIndex) team2Index = (team2Index - 1 + teamCount) % teamCount;

          if (
            team1Index !== team2Index &&
            team1Index !== byeTeamIndex &&
            team2Index !== byeTeamIndex
          ) {
            matchupsToCreate.push({
              leagueId,
              year,
              week,
              team1Id: leagueTeams[team1Index].id,
              team2Id: leagueTeams[team2Index].id,
              team1Score: 0,
              team2Score: 0,
              winnerId: null,
              status: "scheduled",
            });
          }
        }
      }

      if (matchupsToCreate.length > 0) {
        await db.insert(matchups).values(matchupsToCreate);
        totalMatchups += matchupsToCreate.length;

        try {
          const populateResult = await autoPopulateLeagueLineups(
            leagueId,
            year,
            week
          );
          console.log(
            `[matchupService] Week ${week}: Auto-populated ${populateResult.lineupsCreated} lineups ` +
              `(${populateResult.lineupsSkipped} skipped, ${populateResult.errors} errors)`
          );
        } catch (populateError) {
          console.error(
            `[matchupService] Week ${week}: Error auto-populating lineups:`,
            populateError
          );
        }
      }
    } catch (error) {
      errors.push({ week, error: (error as Error).message });
    }
  }

  return {
    success: true,
    totalMatchups,
    errors,
    message: `Generated ${totalMatchups} total matchups for weeks ${startWeek}-${endWeek}`,
  };
}

