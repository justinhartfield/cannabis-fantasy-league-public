import { getDb } from "./db";
import { achievements, matchups, teams, weeklyTeamScores } from "../drizzle/schema";
import { and, eq, gt, sql } from "drizzle-orm";

export type AchievementDefinition = {
  type: string;
  name: string;
  description: string;
  iconUrl?: string;
};

export const ACHIEVEMENT_DEFINITIONS: Record<string, AchievementDefinition> = {
  FIRST_WIN: {
    type: "FIRST_WIN",
    name: "First Blood",
    description: "Won your first matchup.",
    iconUrl: "/badges/first-win.png",
  },
  HIGH_SCORER: {
    type: "HIGH_SCORER",
    name: "High Roller",
    description: "Scored over 150 points in a single week.",
    iconUrl: "/badges/high-roller.png",
  },
  CLOSE_CALL: {
    type: "CLOSE_CALL",
    name: "Nail Biter",
    description: "Won a matchup by less than 5 points.",
    iconUrl: "/badges/close-call.png",
  },
  UNDEFEATED: {
    type: "UNDEFEATED",
    name: "Unstoppable",
    description: "Started the season undefeated (min 3 wins).",
    iconUrl: "/badges/unstoppable.png",
  },
};

export async function checkAchievements(userId: number, leagueId: number) {
  const db = await getDb();
  if (!db) return;

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.leagueId, leagueId), eq(teams.userId, userId)))
    .limit(1);

  if (!team) return;

  // 1. First Win
  if (team.wins > 0) {
    await awardAchievement(userId, ACHIEVEMENT_DEFINITIONS.FIRST_WIN);
  }

  // 2. Undefeated (min 3 wins)
  if (team.wins >= 3 && team.losses === 0 && team.ties === 0) {
    await awardAchievement(userId, ACHIEVEMENT_DEFINITIONS.UNDEFEATED);
  }

  // 3. High Scorer (> 150 pts)
  // Check weekly scores
  const highScores = await db
    .select()
    .from(weeklyTeamScores)
    .where(and(eq(weeklyTeamScores.teamId, team.id), gt(weeklyTeamScores.totalPoints, 150)))
    .limit(1);

  if (highScores.length > 0) {
    await awardAchievement(userId, ACHIEVEMENT_DEFINITIONS.HIGH_SCORER);
  }

  // 4. Close Call (< 5 pts margin win)
  // Check matchups
  // We need to see if this team was team1 or team2 and won by < 5
  const closeWins = await db
    .select()
    .from(matchups)
    .where(
      and(
        eq(matchups.winnerId, team.id),
        sql`ABS(${matchups.team1Score} - ${matchups.team2Score}) < 5`
      )
    )
    .limit(1);

  if (closeWins.length > 0) {
    await awardAchievement(userId, ACHIEVEMENT_DEFINITIONS.CLOSE_CALL);
  }
}

async function awardAchievement(userId: number, def: AchievementDefinition) {
  const db = await getDb();
  if (!db) return;

  // Check if already earned
  const existing = await db
    .select()
    .from(achievements)
    .where(and(eq(achievements.userId, userId), eq(achievements.achievementType, def.type)))
    .limit(1);

  if (existing.length > 0) return; // Already has it

  // Award it
  await db.insert(achievements).values({
    userId,
    achievementType: def.type,
    achievementName: def.name,
    description: def.description,
    iconUrl: def.iconUrl,
  });
  
  console.log(`[Achievements] Awarded ${def.name} to user ${userId}`);
}


