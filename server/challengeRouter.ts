import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { challenges, challengeParticipants, challengeRosters, users } from "../drizzle/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Challenge Router
 * Handles all daily challenge operations
 */

export const challengeRouter = router({
  /**
   * List all challenges with optional filters
   */
  list: publicProcedure
    .input(
      z.object({
        status: z.enum(["open", "drafting", "active", "completed", "all"]).default("all"),
        week: z.number().optional(),
        year: z.number().optional(),
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

      let conditions = [];
      
      if (input.status !== "all") {
        conditions.push(eq(challenges.status, input.status));
      }
      
      if (input.week) {
        conditions.push(eq(challenges.week, input.week));
      }
      
      if (input.year) {
        conditions.push(eq(challenges.year, input.year));
      }

      const challengeList = await db
        .select({
          id: challenges.id,
          name: challenges.name,
          creatorUserId: challenges.creatorUserId,
          year: challenges.year,
          week: challenges.week,
          maxParticipants: challenges.maxParticipants,
          draftRounds: challenges.draftRounds,
          status: challenges.status,
          draftStartTime: challenges.draftStartTime,
          createdAt: challenges.createdAt,
          participantCount: sql<number>`(
            SELECT COUNT(*)::int 
            FROM ${challengeParticipants} 
            WHERE ${challengeParticipants.challengeId} = ${challenges.id}
          )`,
        })
        .from(challenges)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(challenges.createdAt));

      return challengeList;
    }),

  /**
   * Get challenge details by ID
   */
  getById: publicProcedure
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

      // Get participants
      const participants = await db
        .select({
          id: challengeParticipants.id,
          userId: challengeParticipants.userId,
          username: users.username,
          email: users.email,
          draftPosition: challengeParticipants.draftPosition,
          finalScore: challengeParticipants.finalScore,
          finalRank: challengeParticipants.finalRank,
          joinedAt: challengeParticipants.joinedAt,
        })
        .from(challengeParticipants)
        .leftJoin(users, eq(challengeParticipants.userId, users.id))
        .where(eq(challengeParticipants.challengeId, input.challengeId))
        .orderBy(challengeParticipants.draftPosition);

      return {
        ...challenge[0],
        participants,
      };
    }),

  /**
   * Create a new challenge
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(255),
        year: z.number(),
        week: z.number().min(1).max(52),
        maxParticipants: z.number().min(2).max(16).default(8),
        draftRounds: z.number().min(3).max(10).default(5),
        draftStartTime: z.string().optional(),
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

      const newChallenge = await db
        .insert(challenges)
        .values({
          name: input.name,
          creatorUserId: ctx.user.id,
          year: input.year,
          week: input.week,
          maxParticipants: input.maxParticipants,
          draftRounds: input.draftRounds,
          status: "open",
          draftStartTime: input.draftStartTime || null,
        })
        .returning();

      return newChallenge[0];
    }),

  /**
   * Join a challenge
   */
  join: protectedProcedure
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

      // Check if challenge exists and is open
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

      if (challenge[0].status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Challenge is not open for joining",
        });
      }

      // Check if already joined
      const existing = await db
        .select()
        .from(challengeParticipants)
        .where(
          and(
            eq(challengeParticipants.challengeId, input.challengeId),
            eq(challengeParticipants.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing && existing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already joined this challenge",
        });
      }

      // Check if challenge is full
      const participantCount = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(challengeParticipants)
        .where(eq(challengeParticipants.challengeId, input.challengeId));

      if (participantCount[0].count >= challenge[0].maxParticipants) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Challenge is full",
        });
      }

      // Assign draft position (next available)
      const draftPosition = participantCount[0].count + 1;

      // Join challenge
      const participant = await db
        .insert(challengeParticipants)
        .values({
          challengeId: input.challengeId,
          userId: ctx.user.id,
          draftPosition,
        })
        .returning();

      return participant[0];
    }),

  /**
   * Leave a challenge (only before draft starts)
   */
  leave: protectedProcedure
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

      // Check if challenge is still open
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

      if (challenge[0].status !== "open") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot leave challenge after draft has started",
        });
      }

      // Remove participant
      await db
        .delete(challengeParticipants)
        .where(
          and(
            eq(challengeParticipants.challengeId, input.challengeId),
            eq(challengeParticipants.userId, ctx.user.id)
          )
        );

      // Reassign draft positions for remaining participants
      const remaining = await db
        .select()
        .from(challengeParticipants)
        .where(eq(challengeParticipants.challengeId, input.challengeId))
        .orderBy(challengeParticipants.draftPosition);

      for (let i = 0; i < remaining.length; i++) {
        await db
          .update(challengeParticipants)
          .set({ draftPosition: i + 1 })
          .where(eq(challengeParticipants.id, remaining[i].id));
      }

      return { success: true };
    }),

  /**
   * Get participants for a challenge
   */
  getParticipants: publicProcedure
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

      const participants = await db
        .select({
          id: challengeParticipants.id,
          userId: challengeParticipants.userId,
          username: users.username,
          email: users.email,
          draftPosition: challengeParticipants.draftPosition,
          finalScore: challengeParticipants.finalScore,
          finalRank: challengeParticipants.finalRank,
          joinedAt: challengeParticipants.joinedAt,
        })
        .from(challengeParticipants)
        .leftJoin(users, eq(challengeParticipants.userId, users.id))
        .where(eq(challengeParticipants.challengeId, input.challengeId))
        .orderBy(challengeParticipants.draftPosition);

      return participants;
    }),

  /**
   * Get user's roster for a challenge
   */
  getRoster: protectedProcedure
    .input(
      z.object({
        challengeId: z.number(),
        userId: z.number().optional(),
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

      const userId = input.userId || ctx.user.id;

      const roster = await db
        .select()
        .from(challengeRosters)
        .where(
          and(
            eq(challengeRosters.challengeId, input.challengeId),
            eq(challengeRosters.userId, userId)
          )
        )
        .orderBy(challengeRosters.draftRound);

      return roster;
    }),

  /**
   * Get leaderboard for a challenge
   */
  getLeaderboard: publicProcedure
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

      const leaderboard = await db
        .select({
          userId: challengeParticipants.userId,
          username: users.username,
          email: users.email,
          finalScore: challengeParticipants.finalScore,
          finalRank: challengeParticipants.finalRank,
        })
        .from(challengeParticipants)
        .leftJoin(users, eq(challengeParticipants.userId, users.id))
        .where(eq(challengeParticipants.challengeId, input.challengeId))
        .orderBy(desc(challengeParticipants.finalScore));

      return leaderboard;
    }),

  /**
   * Update challenge status (admin only)
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        challengeId: z.number(),
        status: z.enum(["open", "drafting", "active", "completed"]),
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

      // Only admin or creator can update status
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

      if (ctx.user.role !== "admin" && challenge[0].creatorUserId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized to update this challenge",
        });
      }

      await db
        .update(challenges)
        .set({ status: input.status })
        .where(eq(challenges.id, input.challengeId));

      return { success: true };
    }),
});
