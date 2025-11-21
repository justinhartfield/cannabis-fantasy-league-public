import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { trades, teams, rosters } from "../drizzle/schema";
import { eq, and, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const AssetSchema = z.object({
  type: z.enum(["manufacturer", "strain", "product", "pharmacy", "brand"]),
  id: z.number(),
});

export const tradeRouter = router({
  /**
   * Propose a trade
   */
  proposeTrade: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        targetTeamId: z.number(),
        myAssets: z.array(AssetSchema),
        targetAssets: z.array(AssetSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 1. Get My Team
      const myTeam = await db.query.teams.findFirst({
        where: and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)),
      });
      if (!myTeam) throw new TRPCError({ code: "NOT_FOUND", message: "Your team not found" });

      // 2. Verify Ownership (My Assets)
      for (const asset of input.myAssets) {
        const owned = await db.query.rosters.findFirst({
          where: and(
            eq(rosters.teamId, myTeam.id),
            eq(rosters.assetType, asset.type),
            eq(rosters.assetId, asset.id)
          ),
        });
        if (!owned) throw new TRPCError({ code: "BAD_REQUEST", message: `You do not own asset ${asset.type}:${asset.id}` });
      }

      // 3. Verify Ownership (Target Assets)
      for (const asset of input.targetAssets) {
        const owned = await db.query.rosters.findFirst({
          where: and(
            eq(rosters.teamId, input.targetTeamId),
            eq(rosters.assetType, asset.type),
            eq(rosters.assetId, asset.id)
          ),
        });
        if (!owned) throw new TRPCError({ code: "BAD_REQUEST", message: `Target team does not own asset ${asset.type}:${asset.id}` });
      }

      // 4. Create Trade
      await db.insert(trades).values({
        leagueId: input.leagueId,
        team1Id: myTeam.id,
        team2Id: input.targetTeamId,
        team1Assets: input.myAssets,
        team2Assets: input.targetAssets,
        proposedBy: myTeam.id,
        status: "proposed",
      });

      return { success: true };
    }),

  /**
   * Accept a trade
   */
  acceptTrade: protectedProcedure
    .input(z.object({ tradeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const trade = await db.query.trades.findFirst({
        where: eq(trades.id, input.tradeId),
      });
      if (!trade) throw new TRPCError({ code: "NOT_FOUND", message: "Trade not found" });
      if (trade.status !== "proposed") throw new TRPCError({ code: "BAD_REQUEST", message: "Trade is not active" });

      // Verify User is Target (Team 2)
      const team2 = await db.query.teams.findFirst({ where: eq(teams.id, trade.team2Id) });
      if (!team2 || team2.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the target team can accept this trade" });
      }

      // Transaction: Swap Assets
      await db.transaction(async (tx) => {
        // Parse Assets (stored as JSON)
        const team1Assets = trade.team1Assets as { type: string; id: number }[];
        const team2Assets = trade.team2Assets as { type: string; id: number }[];

        // 1. Move Team 1 Assets to Team 2
        for (const asset of team1Assets) {
          // Verify ownership again
          const owned = await tx.query.rosters.findFirst({
            where: and(eq(rosters.teamId, trade.team1Id), eq(rosters.assetType, asset.type), eq(rosters.assetId, asset.id)),
          });
          if (!owned) throw new Error(`Trade failed: Team 1 no longer owns ${asset.type}:${asset.id}`);

          await tx.update(rosters)
            .set({ teamId: trade.team2Id, acquiredVia: "trade" })
            .where(and(eq(rosters.teamId, trade.team1Id), eq(rosters.assetType, asset.type), eq(rosters.assetId, asset.id)));
        }

        // 2. Move Team 2 Assets to Team 1
        for (const asset of team2Assets) {
          const owned = await tx.query.rosters.findFirst({
            where: and(eq(rosters.teamId, trade.team2Id), eq(rosters.assetType, asset.type), eq(rosters.assetId, asset.id)),
          });
          if (!owned) throw new Error(`Trade failed: Team 2 no longer owns ${asset.type}:${asset.id}`);

          await tx.update(rosters)
            .set({ teamId: trade.team1Id, acquiredVia: "trade" })
            .where(and(eq(rosters.teamId, trade.team2Id), eq(rosters.assetType, asset.type), eq(rosters.assetId, asset.id)));
        }

        // 3. Update Trade Status
        await tx.update(trades).set({ status: "accepted", processedWeek: 0 }).where(eq(trades.id, trade.id)); // processedWeek: 0 placeholder or actual current week?
      });

      return { success: true };
    }),

  /**
   * Reject a trade
   */
  rejectTrade: protectedProcedure
    .input(z.object({ tradeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const trade = await db.query.trades.findFirst({
        where: eq(trades.id, input.tradeId),
      });
      if (!trade) throw new TRPCError({ code: "NOT_FOUND", message: "Trade not found" });

      // Verify User is involved
      const team1 = await db.query.teams.findFirst({ where: eq(teams.id, trade.team1Id) });
      const team2 = await db.query.teams.findFirst({ where: eq(teams.id, trade.team2Id) });
      
      if ((team1?.userId !== ctx.user.id) && (team2?.userId !== ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You are not involved in this trade" });
      }

      await db.update(trades).set({ status: "rejected" }).where(eq(trades.id, trade.id));
      return { success: true };
    }),

  /**
   * Get trades for a league
   */
  getTrades: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const myTeam = await db.query.teams.findFirst({
        where: and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)),
      });

      if (!myTeam) return [];

      return await db.select().from(trades).where(
        or(eq(trades.team1Id, myTeam.id), eq(trades.team2Id, myTeam.id))
      ).orderBy(desc(trades.createdAt));
    }),
});
