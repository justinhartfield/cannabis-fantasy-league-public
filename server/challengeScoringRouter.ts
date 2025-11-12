import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { 
  challenges,
  challengeParticipants,
  challengeRosters,
  manufacturerWeeklyStats,
  cannabisStrainWeeklyStats,
  pharmacyWeeklyStats,
  brandWeeklyStats
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Challenge Scoring Router
 * Handles scoring calculations for daily challenges
 */

/**
 * Calculate points for a single asset based on weekly stats
 */
async function calculateAssetPoints(
  db: any,
  assetType: string,
  assetId: number,
  year: number,
  week: number
): Promise<number> {
  let points = 0;

  switch (assetType) {
    case "manufacturer":
      const mfgStats = await db
        .select()
        .from(manufacturerWeeklyStats)
        .where(
          and(
            eq(manufacturerWeeklyStats.manufacturerId, assetId),
            eq(manufacturerWeeklyStats.year, year),
            eq(manufacturerWeeklyStats.week, week)
          )
        )
        .limit(1);
      
      if (mfgStats && mfgStats.length > 0) {
        points = mfgStats[0].totalPoints || 0;
      }
      break;

    case "cannabis_strain":
      const strainStats = await db
        .select()
        .from(cannabisStrainWeeklyStats)
        .where(
          and(
            eq(cannabisStrainWeeklyStats.cannabisStrainId, assetId),
            eq(cannabisStrainWeeklyStats.year, year),
            eq(cannabisStrainWeeklyStats.week, week)
          )
        )
        .limit(1);
      
      if (strainStats && strainStats.length > 0) {
        points = strainStats[0].totalPoints || 0;
      }
      break;

    case "pharmacy":
      const pharmacyStats = await db
        .select()
        .from(pharmacyWeeklyStats)
        .where(
          and(
            eq(pharmacyWeeklyStats.pharmacyId, assetId),
            eq(pharmacyWeeklyStats.year, year),
            eq(pharmacyWeeklyStats.week, week)
          )
        )
        .limit(1);
      
      if (pharmacyStats && pharmacyStats.length > 0) {
        points = pharmacyStats[0].totalPoints || 0;
      }
      break;

    case "brand":
      const brandStats = await db
        .select()
        .from(brandWeeklyStats)
        .where(
          and(
            eq(brandWeeklyStats.brandId, assetId),
            eq(brandWeeklyStats.year, year),
            eq(brandWeeklyStats.week, week)
          )
        )
        .limit(1);
      
      if (brandStats && brandStats.length > 0) {
        points = brandStats[0].totalPoints || 0;
      }
      break;
  }

  return points;
}

export const challengeScoringRouter = router({
  /**
   * Calculate scores for a challenge
   * Called by cron job after week ends
   */
  calculateChallengeScores: protectedProcedure
    .input(
      z.object({
        challengeId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Only admin can calculate scores
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      // Get challenge
      const challenge = await db
        .select()
        .from(challenges)
        .where(eq(challenges.id, input.challengeId))
        .limit(1);

      if (!challenge || challenge.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Challenge not found",
        });
      }

      const { year, week } = challenge[0];

      // Get all participants
      const participants = await db
        .select()
        .from(challengeParticipants)
        .where(eq(challengeParticipants.challengeId, input.challengeId));

      // Calculate scores for each participant
      for (const participant of participants) {
        // Get participant's roster
        const roster = await db
          .select()
          .from(challengeRosters)
          .where(
            and(
              eq(challengeRosters.challengeId, input.challengeId),
              eq(challengeRosters.userId, participant.userId)
            )
          );

        let totalPoints = 0;

        // Calculate points for each asset
        for (const asset of roster) {
          const assetPoints = await calculateAssetPoints(
            db,
            asset.assetType,
            asset.assetId,
            year,
            week
          );

          // Update asset points in roster
          await db
            .update(challengeRosters)
            .set({ points: assetPoints })
            .where(eq(challengeRosters.id, asset.id));

          totalPoints += assetPoints;
        }

        // Update participant's final score
        await db
          .update(challengeParticipants)
          .set({ finalScore: totalPoints })
          .where(eq(challengeParticipants.id, participant.id));
      }

      // Get updated participants sorted by score
      const rankedParticipants = await db
        .select()
        .from(challengeParticipants)
        .where(eq(challengeParticipants.challengeId, input.challengeId))
        .orderBy(desc(challengeParticipants.finalScore));

      // Assign ranks
      for (let i = 0; i < rankedParticipants.length; i++) {
        await db
          .update(challengeParticipants)
          .set({ finalRank: i + 1 })
          .where(eq(challengeParticipants.id, rankedParticipants[i].id));
      }

      // Update challenge status to completed
      await db
        .update(challenges)
        .set({ status: "completed" })
        .where(eq(challenges.id, input.challengeId));

      return {
        success: true,
        message: `Scores calculated for challenge ${input.challengeId}`,
        participantCount: participants.length,
      };
    }),

  /**
   * Calculate scores for all active challenges for a specific week
   * Called by cron job
   */
  calculateWeeklyChallengeScores: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        week: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Only admin can calculate scores
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      // Get all active challenges for this week
      const activeChallenges = await db
        .select()
        .from(challenges)
        .where(
          and(
            eq(challenges.year, input.year),
            eq(challenges.week, input.week),
            eq(challenges.status, "active")
          )
        );

      let calculatedCount = 0;

      // Calculate scores for each challenge
      for (const challenge of activeChallenges) {
        try {
          await challengeScoringRouter.createCaller({ user: ctx.user }).calculateChallengeScores({
            challengeId: challenge.id,
          });
          calculatedCount++;
        } catch (error) {
          console.error(`Error calculating scores for challenge ${challenge.id}:`, error);
        }
      }

      return {
        success: true,
        message: `Calculated scores for ${calculatedCount} challenges`,
        totalChallenges: activeChallenges.length,
      };
    }),

  /**
   * Get scoring breakdown for a participant in a challenge
   */
  getParticipantBreakdown: publicProcedure
    .input(
      z.object({
        challengeId: z.number(),
        userId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Get participant info
      const participant = await db
        .select()
        .from(challengeParticipants)
        .where(
          and(
            eq(challengeParticipants.challengeId, input.challengeId),
            eq(challengeParticipants.userId, input.userId)
          )
        )
        .limit(1);

      if (!participant || participant.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Participant not found",
        });
      }

      // Get roster with points
      const roster = await db
        .select()
        .from(challengeRosters)
        .where(
          and(
            eq(challengeRosters.challengeId, input.challengeId),
            eq(challengeRosters.userId, input.userId)
          )
        )
        .orderBy(challengeRosters.draftRound);

      // Group by asset type
      const breakdown = {
        manufacturer: roster.filter(r => r.assetType === "manufacturer"),
        cannabis_strain: roster.filter(r => r.assetType === "cannabis_strain"),
        pharmacy: roster.filter(r => r.assetType === "pharmacy"),
        brand: roster.filter(r => r.assetType === "brand"),
      };

      const categoryTotals = {
        manufacturer: breakdown.manufacturer.reduce((sum, r) => sum + (r.points || 0), 0),
        cannabis_strain: breakdown.cannabis_strain.reduce((sum, r) => sum + (r.points || 0), 0),
        pharmacy: breakdown.pharmacy.reduce((sum, r) => sum + (r.points || 0), 0),
        brand: breakdown.brand.reduce((sum, r) => sum + (r.points || 0), 0),
      };

      return {
        participant: participant[0],
        roster,
        breakdown,
        categoryTotals,
        totalPoints: participant[0].finalScore,
      };
    }),

  /**
   * Get all participant breakdowns for a challenge
   */
  getAllBreakdowns: publicProcedure
    .input(
      z.object({
        challengeId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Get all participants
      const participants = await db
        .select()
        .from(challengeParticipants)
        .where(eq(challengeParticipants.challengeId, input.challengeId))
        .orderBy(desc(challengeParticipants.finalScore));

      const breakdowns = [];

      for (const participant of participants) {
        const breakdown = await challengeScoringRouter.createCaller({} as any).getParticipantBreakdown({
          challengeId: input.challengeId,
          userId: participant.userId,
        });
        breakdowns.push(breakdown);
      }

      return breakdowns;
    }),
});
