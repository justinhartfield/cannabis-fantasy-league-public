import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { leagues, teams } from "../drizzle/schema";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL not set");
  }
  const client = postgres(dbUrl, { ssl: "require" });
  const db = drizzle(client);

  const now = Date.now();
  const leagueName = `Debug League ${now}`;
  const leagueCode = `DBG${Math.random().toString(36).toUpperCase().slice(2, 8)}`;

  console.log("Creating league", leagueName);
  const leagueResult = await db.insert(leagues).values({
    name: leagueName,
    commissionerUserId: 1,
    teamCount: 10,
    currentWeek: 1,
    status: "draft",
    draftDate: null,
    scoringType: "standard",
    playoffTeams: 6,
    playoffStartWeek: 19,
    seasonYear: new Date().getFullYear(),
    leagueCode,
    leagueType: "season",
    isPublic: false
  }).returning({ id: leagues.id });

  console.log("League result", leagueResult);
  const leagueId = leagueResult[0]?.id;
  console.log("League ID", leagueId);

  const teamResult = await db.insert(teams).values({
    leagueId,
    userId: 1,
    name: `Debug Team ${now}`,
    faabBudget: 100,
  }).returning({ id: teams.id });

  console.log("Team result", teamResult);
}

main().catch((err) => {
  console.error("Debug script error", err);
  process.exitCode = 1;
});
