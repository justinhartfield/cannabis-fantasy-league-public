import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { waiverClaims, teams, rosters, leagues } from "../drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const waiverRouter = router({
  /**
   * Create a new waiver claim
   */
  createClaim: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number(),
      addAssetType: z.string(),
      addAssetId: z.number(),
      dropAssetType: z.string(),
      dropAssetId: z.number(),
      bidAmount: z.number().min(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Get user's team
      const userTeam = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.leagueId, input.leagueId),
          eq(teams.userId, ctx.user.id)
        ))
        .limit(1);

      if (userTeam.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found' });
      }

      const team = userTeam[0];

      // Check FAAB budget
      if (input.bidAmount > team.faabBudget) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient FAAB budget' });
      }

      // Check if player is already owned
      const existingRoster = await db
        .select()
        .from(rosters)
        .where(and(
          eq(rosters.teamId, team.id),
          eq(rosters.assetType, input.dropAssetType),
          eq(rosters.assetId, input.dropAssetId)
        ))
        .limit(1);

      if (existingRoster.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You do not own the player you are trying to drop' });
      }

      // Create claim
      await db.insert(waiverClaims).values({
        leagueId: input.leagueId,
        teamId: team.id,
        year: input.year,
        week: input.week,
        addAssetType: input.addAssetType,
        addAssetId: input.addAssetId,
        dropAssetType: input.dropAssetType,
        dropAssetId: input.dropAssetId,
        bidAmount: input.bidAmount,
        priority: team.waiverPriority,
        status: 'pending',
      });

      return { success: true };
    }),

  /**
   * Get waiver claims for user's team
   */
  getClaims: protectedProcedure
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

      if (userTeam.length === 0) {
        return [];
      }

      const claims = await db
        .select()
        .from(waiverClaims)
        .where(eq(waiverClaims.teamId, userTeam[0].id))
        .orderBy(desc(waiverClaims.createdAt));

      return claims;
    }),

  /**
   * Process waivers for a league (Commissioner only)
   */
  processWaivers: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      year: z.number(),
      week: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Verify commissioner
      const league = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (league.length === 0 || league[0].commissionerUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only commissioner can process waivers' });
      }

      // Get all pending claims for the week
      const pendingClaims = await db
        .select()
        .from(waiverClaims)
        .where(and(
          eq(waiverClaims.leagueId, input.leagueId),
          eq(waiverClaims.year, input.year),
          eq(waiverClaims.week, input.week),
          eq(waiverClaims.status, 'pending')
        ))
        .orderBy(desc(waiverClaims.bidAmount), asc(waiverClaims.priority));

      const processedClaims = [];
      const claimedAssets = new Set<string>(); // format: "type:id"

      for (const claim of pendingClaims) {
        const assetKey = `${claim.addAssetType}:${claim.addAssetId}`;

        if (claimedAssets.has(assetKey)) {
          // Already claimed by higher bid/priority
          await db.update(waiverClaims)
            .set({ status: 'failed', processedAt: new Date().toISOString() })
            .where(eq(waiverClaims.id, claim.id));
          continue;
        }

        // Valid claim
        try {
          // 1. Add new asset to roster
          await db.insert(rosters).values({
            teamId: claim.teamId,
            assetType: claim.addAssetType,
            assetId: claim.addAssetId,
            acquiredWeek: input.week,
            acquiredVia: 'waiver',
          });

          // 2. Remove dropped asset from roster
          await db.delete(rosters).where(and(
            eq(rosters.teamId, claim.teamId),
            eq(rosters.assetType, claim.dropAssetType),
            eq(rosters.assetId, claim.dropAssetId)
          ));

          // 3. Deduct FAAB
          const team = await db.select().from(teams).where(eq(teams.id, claim.teamId)).limit(1);
          if (team.length > 0) {
            await db.update(teams)
              .set({ faabBudget: team[0].faabBudget - claim.bidAmount })
              .where(eq(teams.id, claim.teamId));
          }

          // 4. Mark claim success
          await db.update(waiverClaims)
            .set({ status: 'success', processedAt: new Date().toISOString() })
            .where(eq(waiverClaims.id, claim.id));

          claimedAssets.add(assetKey);
          processedClaims.push(claim.id);

        } catch (error) {
          console.error(`Failed to process claim ${claim.id}:`, error);
          await db.update(waiverClaims)
            .set({ status: 'error', processedAt: new Date().toISOString() })
            .where(eq(waiverClaims.id, claim.id));
        }
      }

      return { success: true, processedCount: processedClaims.length };
    }),
});

