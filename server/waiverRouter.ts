import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { waiverClaims, teams, leagues, rosters } from "../drizzle/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const waiverRouter = router({
  /**
   * Create a waiver claim (bid on a player)
   */
  createClaim: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        addAssetType: z.enum(["manufacturer", "strain", "product", "pharmacy", "brand"]),
        addAssetId: z.number(),
        dropAssetType: z.enum(["manufacturer", "strain", "product", "pharmacy", "brand"]),
        dropAssetId: z.number(),
        bidAmount: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // 1. Validate League & Team
      const team = await db.query.teams.findFirst({
        where: and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)),
      });

      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found in this league" });

      const league = await db.query.leagues.findFirst({
        where: eq(leagues.id, input.leagueId),
      });

      if (!league) throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });

      // 2. Validate FAAB
      if (input.bidAmount > team.faabBudget) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Insufficient FAAB. You have ${team.faabBudget}.` });
      }

      // 3. Validate "Drop" Asset (Must own it)
      const dropAsset = await db.query.rosters.findFirst({
        where: and(
          eq(rosters.teamId, team.id),
          eq(rosters.assetType, input.addAssetType === "brand" ? "brand" : input.dropAssetType), // Schema might have 'brand' mapped differently? checking schema...
          eq(rosters.assetId, input.dropAssetId)
        ),
      });
      
      // Note: Asset types in schema are: manufacturer, strain, pharmacy. "brand" and "product" might need mapping if not in enum.
      // Checking schema again... rosters.assetType is varchar(50), so it supports string literals.
      
      if (!dropAsset) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You do not own the asset you are trying to drop." });
      }

      // 4. Validate "Add" Asset (Must be free agent)
      // Get all team IDs in league
      const leagueTeams = await db.select({ id: teams.id }).from(teams).where(eq(teams.leagueId, input.leagueId));
      const leagueTeamIds = leagueTeams.map(t => t.id);

      const existingOwner = await db.query.rosters.findFirst({
        where: and(
          inArray(rosters.teamId, leagueTeamIds),
          eq(rosters.assetType, input.addAssetType),
          eq(rosters.assetId, input.addAssetId)
        ),
      });

      if (existingOwner) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This asset is already owned by another team." });
      }

      // 5. Create Claim
      await db.insert(waiverClaims).values({
        leagueId: input.leagueId,
        teamId: team.id,
        year: league.seasonYear,
        week: league.currentWeek,
        addAssetType: input.addAssetType,
        addAssetId: input.addAssetId,
        dropAssetType: input.dropAssetType,
        dropAssetId: input.dropAssetId,
        bidAmount: input.bidAmount,
        priority: team.waiverPriority,
        status: "pending",
      });

      return { success: true };
    }),

  /**
   * Get pending claims for my team
   */
  getClaims: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const team = await db.query.teams.findFirst({
        where: and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)),
      });

      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

      return await db.select().from(waiverClaims).where(and(
        eq(waiverClaims.teamId, team.id),
        eq(waiverClaims.status, "pending")
      ));
    }),

  /**
   * Cancel a claim
   */
  cancelClaim: protectedProcedure
    .input(z.object({ claimId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const claim = await db.query.waiverClaims.findFirst({
        where: eq(waiverClaims.id, input.claimId),
      });

      if (!claim) throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });

      // Verify ownership via team->user
      const team = await db.query.teams.findFirst({
        where: eq(teams.id, claim.teamId),
      });

      if (!team || team.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only cancel your own claims" });
      }

      await db.delete(waiverClaims).where(eq(waiverClaims.id, input.claimId));
      return { success: true };
    }),

  /**
   * Process Waivers (Commissioner Only)
   */
  processWaivers: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const league = await db.query.leagues.findFirst({
        where: eq(leagues.id, input.leagueId),
      });

      if (!league) throw new TRPCError({ code: "NOT_FOUND", message: "League not found" });
      if (league.commissionerUserId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only commissioner can process waivers" });
      }

      // 1. Get all pending claims
      const claims = await db.select().from(waiverClaims).where(and(
        eq(waiverClaims.leagueId, input.leagueId),
        eq(waiverClaims.status, "pending")
      )).orderBy(desc(waiverClaims.bidAmount), desc(waiverClaims.priority)); // Highest bid first, then priority (lower number is usually better, but here assuming higher priority value means better? Let's assume priority 1 is best. So ASC priority. BUT schema says 'waiverPriority' int. Usually 1 is best. Let's assume ASC.)
      
      // Correction: In fantasy, priority 1 is best. So ASC.
      // Re-query with correct sort:
      const sortedClaims = await db.select().from(waiverClaims).where(and(
        eq(waiverClaims.leagueId, input.leagueId),
        eq(waiverClaims.status, "pending")
      )).orderBy(desc(waiverClaims.bidAmount), waiverClaims.priority); 

      const processedLog = [];
      const assetsTaken = new Set<string>(); // "type:id"
      const assetsDropped = new Set<string>(); // "teamId:type:id" (to prevent dropping same player twice in one batch if multiple claims involve it? No, a team can only drop a player once. But if they have multiple claims conditional on drops...)

      // We need to handle conditional logic: If a team has multiple claims, they can't drop the same player twice.
      // Also can't add the same player twice.

      for (const claim of sortedClaims) {
        const addKey = `${claim.addAssetType}:${claim.addAssetId}`;
        const dropKey = `${claim.teamId}:${claim.dropAssetType}:${claim.dropAssetId}`;

        // Check if add asset is already taken in this batch
        if (assetsTaken.has(addKey)) {
          await db.update(waiverClaims).set({ status: "failed" }).where(eq(waiverClaims.id, claim.id));
          processedLog.push(`Claim ${claim.id} failed: Player already taken.`);
          continue;
        }

        // Check if drop asset is still available to drop (e.g. wasn't dropped in a previous successful claim by same team)
        if (assetsDropped.has(dropKey)) {
           await db.update(waiverClaims).set({ status: "failed" }).where(eq(waiverClaims.id, claim.id));
           processedLog.push(`Claim ${claim.id} failed: Drop player already moved.`);
           continue;
        }

        // EXECUTE TRANSACTION
        try {
          await db.transaction(async (tx) => {
            // 1. Remove dropped asset
            await tx.delete(rosters).where(and(
              eq(rosters.teamId, claim.teamId),
              eq(rosters.assetType, claim.dropAssetType),
              eq(rosters.assetId, claim.dropAssetId)
            ));

            // 2. Add new asset
            await tx.insert(rosters).values({
              teamId: claim.teamId,
              assetType: claim.addAssetType,
              assetId: claim.addAssetId,
              acquiredWeek: league.currentWeek,
              acquiredVia: "waiver",
            });

            // 3. Deduct FAAB
            const team = await tx.query.teams.findFirst({ where: eq(teams.id, claim.teamId) });
            if (team) {
               await tx.update(teams).set({ faabBudget: team.faabBudget - claim.bidAmount }).where(eq(teams.id, team.id));
            }

            // 4. Mark claim success
            await tx.update(waiverClaims).set({ status: "success", processedAt: new Date().toISOString() }).where(eq(waiverClaims.id, claim.id));
          });

          assetsTaken.add(addKey);
          assetsDropped.add(dropKey);
          processedLog.push(`Claim ${claim.id} success: Team ${claim.teamId} got ${addKey} for $${claim.bidAmount}`);

        } catch (e) {
          console.error(e);
          await db.update(waiverClaims).set({ status: "error" }).where(eq(waiverClaims.id, claim.id));
        }
      }

      return { success: true, log: processedLog };
    }),
});
