import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { leagues, matchups, teams, users, weeklyTeamScores } from "../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendEmail } from "./_core/email";

export const recapRouter = router({
  getWeeklyRecap: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        year: z.number(),
        week: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Check if league exists and user is a member
      const [league] = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (!league) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "League not found",
        });
      }

      // Verify membership
      const userTeam = await db
        .select()
        .from(teams)
        .where(and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)))
        .limit(1);

      if (!userTeam.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this league",
        });
      }

      // 1. Fetch weekly scores to find High Scorer
      const scores = await db
        .select({
          teamId: weeklyTeamScores.teamId,
          totalPoints: weeklyTeamScores.totalPoints,
          teamName: teams.name,
          avatarUrl: users.avatarUrl,
        })
        .from(weeklyTeamScores)
        .innerJoin(teams, eq(weeklyTeamScores.teamId, teams.id))
        .innerJoin(users, eq(teams.userId, users.id))
        .where(
          and(
            eq(teams.leagueId, input.leagueId),
            eq(weeklyTeamScores.year, input.year),
            eq(weeklyTeamScores.week, input.week)
          )
        )
        .orderBy(desc(weeklyTeamScores.totalPoints));

      // 2. Fetch matchups to find Close Calls and Blowouts
      const weekMatchups = await db
        .select({
          id: matchups.id,
          team1Id: matchups.team1Id,
          team2Id: matchups.team2Id,
          team1Score: matchups.team1Score,
          team2Score: matchups.team2Score,
          team1Name: teams.name, // Note: This join is tricky with two teams, usually need aliases or separate queries. 
          // To simplify, we'll fetch team names from the 'scores' map or separate query if needed, 
          // but since we already joined teams in 'scores', we can look them up in memory.
        })
        .from(matchups)
        .leftJoin(teams, eq(matchups.team1Id, teams.id)) // Just getting one name here for now, ideally we need both
        .where(
          and(
            eq(matchups.leagueId, input.leagueId),
            eq(matchups.year, input.year),
            eq(matchups.week, input.week)
          )
        );

      // Helper to get team details from scores array
      const getTeamDetails = (id: number) => scores.find((s) => s.teamId === id);

      let closeCall = null;
      let blowout = null;
      let highestScore = scores[0] || null;

      if (weekMatchups.length > 0) {
        // Calculate margins
        const margins = weekMatchups.map((m) => {
          const margin = Math.abs(m.team1Score - m.team2Score);
          const team1 = getTeamDetails(m.team1Id);
          const team2 = getTeamDetails(m.team2Id);
          return { ...m, margin, team1, team2 };
        });

        // Sort by margin
        margins.sort((a, b) => a.margin - b.margin);
        closeCall = margins[0]; // Smallest margin
        blowout = margins[margins.length - 1]; // Largest margin
      }

      return {
        leagueName: league.name,
        week: input.week,
        year: input.year,
        highestScore,
        closeCall: closeCall ? {
          margin: closeCall.margin,
          winner: closeCall.team1Score > closeCall.team2Score ? closeCall.team1 : closeCall.team2,
          loser: closeCall.team1Score > closeCall.team2Score ? closeCall.team2 : closeCall.team1,
          score: `${Math.max(closeCall.team1Score, closeCall.team2Score)} - ${Math.min(closeCall.team1Score, closeCall.team2Score)}`
        } : null,
        blowout: blowout ? {
          margin: blowout.margin,
          winner: blowout.team1Score > blowout.team2Score ? blowout.team1 : blowout.team2,
          loser: blowout.team1Score > blowout.team2Score ? blowout.team2 : blowout.team1,
          score: `${Math.max(blowout.team1Score, blowout.team2Score)} - ${Math.min(blowout.team1Score, blowout.team2Score)}`
        } : null,
      };
    }),

  sendRecapEmail: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        year: z.number(),
        week: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      // Fetch League & Users
      const leagueMembers = await db
        .select({
            email: users.email,
            name: users.name
        })
        .from(teams)
        .innerJoin(users, eq(teams.userId, users.id))
        .where(eq(teams.leagueId, input.leagueId));

      const validEmails = leagueMembers.filter(m => m.email && m.email.includes("@")).map(m => m.email as string);

      if (validEmails.length === 0) {
        return { success: false, message: "No valid emails found" };
      }

      // Construct email content (simplified for now)
      const subject = `Weekly Recap: Week ${input.week} - Cannabis Fantasy League`;
      const htmlBody = `
        <h1>Week ${input.week} Recap</h1>
        <p>The results are in! Check out the dashboard to see who crushed it and who... got crushed.</p>
        <a href="https://cannabisfantasyleague.com/league/${input.leagueId}">View Full Recap</a>
      `;

      // Send to all (could be optimized with batch sending or bcc)
      // For Postmark, we can send individual emails or use a broadcast stream. 
      // We'll loop for simplicity in this MVP.
      let sentCount = 0;
      for (const email of validEmails) {
        const success = await sendEmail({
            to: email,
            subject,
            htmlBody
        });
        if (success) sentCount++;
      }

      return { success: true, sentCount };
    }),
});


