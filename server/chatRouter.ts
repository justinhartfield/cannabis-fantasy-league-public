import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { leagueMessages, users, teams } from "../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { wsManager } from "./websocket";

export const chatRouter = router({
  getMessages: protectedProcedure
    .input(z.object({
        leagueId: z.number(),
        limit: z.number().default(50),
        cursor: z.number().optional(), // for pagination if needed, defaulting to simple limit for now
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      // Check membership
      const userTeam = await db
        .select()
        .from(teams)
        .where(and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)))
        .limit(1);

      if (!userTeam.length) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this league" });
      }

      const messages = await db
        .select({
            id: leagueMessages.id,
            userId: leagueMessages.userId,
            message: leagueMessages.message,
            createdAt: leagueMessages.createdAt,
            userName: users.name,
            userAvatarUrl: users.avatarUrl
        })
        .from(leagueMessages)
        .leftJoin(users, eq(leagueMessages.userId, users.id))
        .where(eq(leagueMessages.leagueId, input.leagueId))
        .orderBy(desc(leagueMessages.createdAt))
        .limit(input.limit);

      return messages.reverse(); // Return oldest to newest for chat UI
    }),

  postMessage: protectedProcedure
    .input(z.object({
        leagueId: z.number(),
        message: z.string().min(1).max(1000),
    }))
    .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

        // Check membership
        const userTeam = await db
            .select()
            .from(teams)
            .where(and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)))
            .limit(1);

        if (!userTeam.length) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this league" });
        }

        const [newMessage] = await db
            .insert(leagueMessages)
            .values({
                leagueId: input.leagueId,
                userId: ctx.user.id,
                message: input.message,
            })
            .returning();

        // Broadcast via WebSocket
        wsManager.notifyChatMessage(input.leagueId, {
            id: newMessage.id,
            userId: ctx.user.id,
            userName: ctx.user.name || "Unknown",
            userAvatarUrl: ctx.user.avatarUrl,
            message: newMessage.message,
            createdAt: newMessage.createdAt,
        });

        return newMessage;
    }),
});


