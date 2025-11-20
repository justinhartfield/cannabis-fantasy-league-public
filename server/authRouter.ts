import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Auth Router
 * Handles authentication operations with Clerk
 */

export const authRouter = router({
  /**
   * Get Current User (me endpoint)
   * Returns the currently authenticated user from Clerk
   */
  me: publicProcedure.query(async ({ ctx }) => {
    // For now, return null since we need to implement Clerk backend verification
    // In production, this should verify the Clerk session and return user data
    return null;
  }),

  /**
   * Logout
   * Clears the user session (handled by Clerk on frontend)
   */
  logout: publicProcedure.mutation(async () => {
    return {
      success: true,
    };
  }),

  /**
   * Get Current User (legacy endpoint for compatibility)
   * Returns the currently authenticated user
   */
  getCurrentUser: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
    };
  }),
});
