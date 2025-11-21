import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { achievements } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const achievementRouter = router({
  getMine: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const myAchievements = await db
      .select()
      .from(achievements)
      .where(eq(achievements.userId, ctx.user.id))
      .orderBy(desc(achievements.earnedAt));

    return myAchievements;
  }),
});


