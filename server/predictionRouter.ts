import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { 
  dailyMatchups, 
  userPredictions, 
  users,
  manufacturers,
  brands,
  pharmacies,
  cannabisStrains,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// Lazy initialization helper
let isInitialized = false;
async function ensureMatchupsExist() {
  if (isInitialized) return;
  
  const db = await getDb();
  if (!db) return;
  
  const today = new Date().toISOString().split('T')[0];
  const existing = await db
    .select()
    .from(dailyMatchups)
    .where(eq(dailyMatchups.matchupDate, today))
    .limit(1);
  
  if (existing.length === 0) {
    console.log('[PredictionRouter] No matchups found, triggering generation...');
    const { generateDailyMatchups } = await import('./predictionService');
    await generateDailyMatchups();
  }
  
  isInitialized = true;
}

export const predictionRouter = router({
  
  getDailyMatchups: protectedProcedure.query(async ({ ctx }) => {
    // Ensure matchups exist (lazy initialization)
    await ensureMatchupsExist();
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const today = new Date().toISOString().split('T')[0];
    const userId = ctx.user.id;

    const matchups = await db
      .select()
      .from(dailyMatchups)
      .where(eq(dailyMatchups.matchupDate, today))
      .orderBy(dailyMatchups.id);

    const predictions = await db
      .select()
      .from(userPredictions)
      .where(eq(userPredictions.userId, userId));

    const predictionMap = new Map(
      predictions.map(p => [p.matchupId, p])
    );

    // Fetch images for all entities
    const { getEntityImage } = await import('./entityImageHelper');
    const matchupsWithPredictions = await Promise.all(
      matchups.map(async (matchup) => {
        const [entityAImage, entityBImage] = await Promise.all([
          getEntityImage(matchup.entityType, matchup.entityAId),
          getEntityImage(matchup.entityType, matchup.entityBId),
        ]);
        return {
          ...matchup,
          entityAImage,
          entityBImage,
          userPrediction: predictionMap.get(matchup.id) || null,
        };
      })
    );

    return {
      matchups: matchupsWithPredictions,
      hasSubmitted: matchupsWithPredictions.every(m => m.userPrediction !== null),
    };
  }),

  getYesterdayResults: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const userId = ctx.user.id;

    const matchups = await db
      .select()
      .from(dailyMatchups)
      .where(and(
        eq(dailyMatchups.matchupDate, yesterdayStr),
        eq(dailyMatchups.isScored, 1)
      ))
      .orderBy(dailyMatchups.id);

    const predictions = await db
      .select()
      .from(userPredictions)
      .where(eq(userPredictions.userId, userId));

    const predictionMap = new Map(
      predictions.map(p => [p.matchupId, p])
    );

    const results = matchups.map(matchup => ({
      ...matchup,
      userPrediction: predictionMap.get(matchup.id) || null,
    }));

    const correctCount = results.filter(r => r.userPrediction?.isCorrect === 1).length;
    const totalCount = results.filter(r => r.userPrediction !== null).length;

    return {
      results,
      correctCount,
      totalCount,
      accuracy: totalCount > 0 ? (correctCount / totalCount) * 100 : 0,
    };
  }),

  submitPredictions: protectedProcedure
    .input(
      z.object({
        predictions: z.array(
          z.object({
            matchupId: z.number(),
            predictedWinnerId: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const userId = ctx.user.id;
      const today = new Date().toISOString().split('T')[0];

      const matchupIds = input.predictions.map(p => p.matchupId);
      const matchups = await db
        .select()
        .from(dailyMatchups)
        .where(eq(dailyMatchups.matchupDate, today));

      const validMatchupIds = new Set(matchups.map(m => m.id));
      
      for (const prediction of input.predictions) {
        if (!validMatchupIds.has(prediction.matchupId)) {
          throw new Error(`Invalid matchup ID: ${prediction.matchupId}`);
        }
      }

      for (const prediction of input.predictions) {
        try {
          await db
            .insert(userPredictions)
            .values({
              userId,
              matchupId: prediction.matchupId,
              predictedWinnerId: prediction.predictedWinnerId,
            })
            .onConflictDoUpdate({
              target: [userPredictions.userId, userPredictions.matchupId],
              set: {
                predictedWinnerId: prediction.predictedWinnerId,
                submittedAt: sql`NOW()`,
              },
            });
        } catch (error) {
          console.error('[PredictionRouter] Error inserting prediction:', error);
          throw new Error('Failed to save prediction');
        }
      }

      return {
        success: true,
        message: 'Predictions submitted successfully',
      };
    }),

  getLeaderboard: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const limit = input?.limit || 50;
      const currentUserId = ctx.user.id;

      const topUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          currentStreak: users.currentPredictionStreak,
          longestStreak: users.longestPredictionStreak,
        })
        .from(users)
        .orderBy(desc(users.longestPredictionStreak), desc(users.currentPredictionStreak))
        .limit(limit);

      const leaderboard = topUsers.map((user, index) => ({
        rank: index + 1,
        id: user.id,
        name: user.name || user.email || 'Anonymous',
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        isCurrentUser: user.id === currentUserId,
      }));

      let currentUserRank = leaderboard.find(u => u.isCurrentUser)?.rank;
      
      if (!currentUserRank) {
        const [currentUser] = await db
          .select({
            longestStreak: users.longestPredictionStreak,
          })
          .from(users)
          .where(eq(users.id, currentUserId))
          .limit(1);

        if (currentUser) {
          const usersAhead = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(sql`${users.longestPredictionStreak} > ${currentUser.longestStreak}`);
          
          currentUserRank = (usersAhead[0]?.count || 0) + 1;
        }
      }

      return {
        leaderboard,
        currentUserRank: currentUserRank || null,
      };
    }),

  getUserStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    const userId = ctx.user.id;

    const [user] = await db
      .select({
        currentStreak: users.currentPredictionStreak,
        longestStreak: users.longestPredictionStreak,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const totalPredictions = await db
      .select({ count: sql<number>`count(*)` })
      .from(userPredictions)
      .where(eq(userPredictions.userId, userId));

    const correctPredictions = await db
      .select({ count: sql<number>`count(*)` })
      .from(userPredictions)
      .where(and(
        eq(userPredictions.userId, userId),
        eq(userPredictions.isCorrect, 1)
      ));

    const total = totalPredictions[0]?.count || 0;
    const correct = correctPredictions[0]?.count || 0;
    const accuracy = total > 0 ? (correct / total) * 100 : 0;

    return {
      currentStreak: user?.currentStreak || 0,
      longestStreak: user?.longestStreak || 0,
      totalPredictions: total,
      correctPredictions: correct,
      accuracy: Math.round(accuracy * 10) / 10,
    };
  }),
});
