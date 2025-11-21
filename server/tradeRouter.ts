import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { trades, teams, rosters } from "../drizzle/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const AssetSchema = z.object({
  assetType: z.string(),
  assetId: z.number(),
});

export const tradeRouter = router({
  /**
   * Propose a trade
   */
  proposeTrade: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      team2Id: z.number(),
      team1Assets: z.array(AssetSchema),
      team2Assets: z.array(AssetSchema),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Get user's team (Team 1)
      const userTeam = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.leagueId, input.leagueId),
          eq(teams.userId, ctx.user.id)
        ))
        .limit(1);

      if (userTeam.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Your team not found' });
      }
      const team1Id = userTeam[0].id;

      // Verify Team 1 owns assets
      for (const asset of input.team1Assets) {
        const owned = await db
          .select()
          .from(rosters)
          .where(and(
            eq(rosters.teamId, team1Id),
            eq(rosters.assetType, asset.assetType),
            eq(rosters.assetId, asset.assetId)
          ))
          .limit(1);
        
        if (owned.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `You do not own asset ${asset.assetType}:${asset.assetId}` });
        }
      }

      // Verify Team 2 owns assets
      for (const asset of input.team2Assets) {
        const owned = await db
          .select()
          .from(rosters)
          .where(and(
            eq(rosters.teamId, input.team2Id),
            eq(rosters.assetType, asset.assetType),
            eq(rosters.assetId, asset.assetId)
          ))
          .limit(1);
        
        if (owned.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `Opponent does not own asset ${asset.assetType}:${asset.assetId}` });
        }
      }

      // Create trade
      await db.insert(trades).values({
        leagueId: input.leagueId,
        team1Id: team1Id,
        team2Id: input.team2Id,
        team1Assets: input.team1Assets,
        team2Assets: input.team2Assets,
        proposedBy: team1Id,
        status: 'proposed',
      });

      return { success: true };
    }),

  /**
   * Get trades for user
   */
  getTrades: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const userTeam = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.leagueId, input.leagueId),
          eq(teams.userId, ctx.user.id)
        ))
        .limit(1);

      if (userTeam.length === 0) return [];
      const teamId = userTeam[0].id;

      const myTrades = await db
        .select()
        .from(trades)
        .where(or(
          eq(trades.team1Id, teamId),
          eq(trades.team2Id, teamId)
        ))
        .orderBy(desc(trades.createdAt));

      return myTrades;
    }),

  /**
   * Respond to trade (accept/reject)
   */
  respondTrade: protectedProcedure
    .input(z.object({
      tradeId: z.number(),
      action: z.enum(['accept', 'reject']),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const trade = await db
        .select()
        .from(trades)
        .where(eq(trades.id, input.tradeId))
        .limit(1);

      if (trade.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Trade not found' });
      }

      const tradeRecord = trade[0];

      // Verify user is the one who needs to respond (Team 2)
      // Unless they are rejecting their own proposal? Let's stick to recipient responds.
      const userTeam = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.leagueId, tradeRecord.leagueId),
          eq(teams.userId, ctx.user.id)
        ))
        .limit(1);

      if (userTeam.length === 0 || userTeam[0].id !== tradeRecord.team2Id) {
        // Allow proposer to cancel (reject) their own trade
        if (input.action === 'reject' && userTeam.length > 0 && userTeam[0].id === tradeRecord.team1Id) {
           // Proposer cancelling
        } else {
           throw new TRPCError({ code: 'FORBIDDEN', message: 'Not authorized to respond to this trade' });
        }
      }

      if (input.action === 'reject') {
        await db.update(trades).set({ status: 'rejected' }).where(eq(trades.id, input.tradeId));
        return { success: true, status: 'rejected' };
      }

      // Accepting Trade
      if (tradeRecord.status !== 'proposed') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Trade is not active' });
      }

      // 1. Verify ownership again
      // (Simplification: assuming valid JSON structure)
      const assets1 = tradeRecord.team1Assets as { assetType: string, assetId: number }[];
      const assets2 = tradeRecord.team2Assets as { assetType: string, assetId: number }[];

      // 2. Swap assets
      // Remove from old teams
      for (const asset of assets1) {
        await db.delete(rosters).where(and(eq(rosters.teamId, tradeRecord.team1Id), eq(rosters.assetType, asset.assetType), eq(rosters.assetId, asset.assetId)));
      }
      for (const asset of assets2) {
        await db.delete(rosters).where(and(eq(rosters.teamId, tradeRecord.team2Id), eq(rosters.assetType, asset.assetType), eq(rosters.assetId, asset.assetId)));
      }

      // Add to new teams
      for (const asset of assets1) {
        await db.insert(rosters).values({ teamId: tradeRecord.team2Id, assetType: asset.assetType, assetId: asset.assetId, acquiredWeek: 0, acquiredVia: 'trade' }); // Week 0 placeholder
      }
      for (const asset of assets2) {
        await db.insert(rosters).values({ teamId: tradeRecord.team1Id, assetType: asset.assetType, assetId: asset.assetId, acquiredWeek: 0, acquiredVia: 'trade' });
      }

      await db.update(trades).set({ status: 'accepted' }).where(eq(trades.id, input.tradeId));

      return { success: true, status: 'accepted' };
    }),
});

