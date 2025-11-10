import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Auth Router
 * Handles authentication operations
 * 
 * For development: Uses mock authentication
 * For production: Would integrate with real OAuth provider
 */

export const authRouter = router({
  /**
   * Mock Login - For development/testing only
   * Creates or finds a user and returns session info
   */
  mockLogin: publicProcedure
    .input(
      z.object({
        username: z.string().min(3).max(50),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Check if user exists
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);

        let user;

        if (existingUser) {
          // User exists, return it
          user = existingUser;
        } else {
          // Create new user
          const [newUser] = await db
            .insert(users)
            .values({
              username: input.username,
              email: `${input.username}@test.local`,
              displayName: input.username,
            })
            .$returningId();

          const [createdUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, newUser.id))
            .limit(1);

          user = createdUser;
        }

        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
          },
        };
      } catch (error) {
        console.error("Mock login error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to authenticate user",
        });
      }
    }),

  /**
   * Get Current User
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

  /**
   * Logout
   * Clears the user session
   */
  logout: publicProcedure.mutation(async () => {
    return {
      success: true,
    };
  }),
});
