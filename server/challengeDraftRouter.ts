import { z } from "zod";
import { eq, and, notInArray, inArray, sql, desc } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { 
  manufacturers, 
  cannabisStrains, 
  strains, 
  pharmacies, 
  brands, 
  challenges,
  challengeParticipants,
  challengeRosters 
} from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

/**
 * Challenge Draft Router
 * Handles draft operations for daily challenges
 */
export const challengeDraftRouter = router({
  /**
   * Get draft state for a challenge
   */
  getDraftState: protectedProcedure
    .input(
      z.object({
        challengeId: z.number(),
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

      // Get challenge
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
        .select()
        .from(challengeParticipants)
        .where(eq(challengeParticipants.challengeId, input.challengeId))
        .orderBy(challengeParticipants.draftPosition);

      // Get all picks made so far
      const picks = await db
        .select()
        .from(challengeRosters)
        .where(eq(challengeRosters.challengeId, input.challengeId))
        .orderBy(challengeRosters.draftPick);

      // Calculate current pick
      const totalPicks = picks.length;
      const totalRounds = challenge[0].draftRounds;
      const participantCount = participants.length;
      const currentRound = Math.floor(totalPicks / participantCount) + 1;
      
      // Snake draft logic
      const isSnakeRound = currentRound % 2 === 0;
      const positionInRound = totalPicks % participantCount;
      const currentPickerPosition = isSnakeRound 
        ? participantCount - positionInRound 
        : positionInRound + 1;

      const currentPicker = participants.find(p => p.draftPosition === currentPickerPosition);
      const isDraftComplete = totalPicks >= (totalRounds * participantCount);

      return {
        challenge: challenge[0],
        participants,
        picks,
        currentRound,
        currentPicker,
        isDraftComplete,
        totalPicks,
        isUserTurn: currentPicker?.userId === ctx.user.id,
      };
    }),

  /**
   * Get available assets for drafting
   */
  getAvailableAssets: protectedProcedure
    .input(
      z.object({
        challengeId: z.number(),
        assetType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
        search: z.string().optional(),
        limit: z.number().default(100),
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

      // Get already drafted assets of this type
      const draftedAssets = await db
        .select({ assetId: challengeRosters.assetId })
        .from(challengeRosters)
        .where(
          and(
            eq(challengeRosters.challengeId, input.challengeId),
            eq(challengeRosters.assetType, input.assetType)
          )
        );

      const draftedIds = draftedAssets.map(r => r.assetId);

      // Get available assets based on type
      let available: any[] = [];

      switch (input.assetType) {
        case "manufacturer":
          let mfgQuery = db.select().from(manufacturers);
          if (draftedIds.length > 0) {
            mfgQuery = mfgQuery.where(notInArray(manufacturers.id, draftedIds)) as any;
          }
          if (input.search) {
            mfgQuery = mfgQuery.where(sql`${manufacturers.name} ILIKE ${`%${input.search}%`}`) as any;
          }
          available = await mfgQuery.limit(input.limit);
          break;

        case "cannabis_strain":
          let strainQuery = db.select().from(cannabisStrains);
          if (draftedIds.length > 0) {
            strainQuery = strainQuery.where(notInArray(cannabisStrains.id, draftedIds)) as any;
          }
          if (input.search) {
            strainQuery = strainQuery.where(sql`${cannabisStrains.name} ILIKE ${`%${input.search}%`}`) as any;
          }
          available = await strainQuery.limit(input.limit);
          break;

        case "pharmacy":
          let pharmacyQuery = db.select().from(pharmacies);
          if (draftedIds.length > 0) {
            pharmacyQuery = pharmacyQuery.where(notInArray(pharmacies.id, draftedIds)) as any;
          }
          if (input.search) {
            pharmacyQuery = pharmacyQuery.where(sql`${pharmacies.name} ILIKE ${`%${input.search}%`}`) as any;
          }
          available = await pharmacyQuery.limit(input.limit);
          break;

        case "brand":
          let brandQuery = db.select().from(brands);
          if (draftedIds.length > 0) {
            brandQuery = brandQuery.where(notInArray(brands.id, draftedIds)) as any;
          }
          if (input.search) {
            brandQuery = brandQuery.where(sql`${brands.name} ILIKE ${`%${input.search}%`}`) as any;
          }
          available = await brandQuery.limit(input.limit);
          break;
      }

      return available;
    }),

  /**
   * Make a draft pick
   */
  makePick: protectedProcedure
    .input(
      z.object({
        challengeId: z.number(),
        assetType: z.enum(["manufacturer", "cannabis_strain", "product", "pharmacy", "brand"]),
        assetId: z.number(),
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

      // Verify it's the user's turn
      const draftState = await challengeDraftRouter.createCaller({ user: ctx.user }).getDraftState({
        challengeId: input.challengeId,
      });

      if (!draftState.isUserTurn) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "It's not your turn to pick",
        });
      }

      if (draftState.isDraftComplete) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Draft is already complete",
        });
      }

      // Check if asset is already drafted
      const existing = await db
        .select()
        .from(challengeRosters)
        .where(
          and(
            eq(challengeRosters.challengeId, input.challengeId),
            eq(challengeRosters.assetType, input.assetType),
            eq(challengeRosters.assetId, input.assetId)
          )
        )
        .limit(1);

      if (existing && existing.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Asset already drafted",
        });
      }

      // Make the pick
      const pick = await db
        .insert(challengeRosters)
        .values({
          challengeId: input.challengeId,
          userId: ctx.user.id,
          assetType: input.assetType,
          assetId: input.assetId,
          draftRound: draftState.currentRound,
          draftPick: draftState.totalPicks + 1,
          points: 0,
        })
        .returning();

      // Check if draft is now complete
      const newTotalPicks = draftState.totalPicks + 1;
      const isDraftComplete = newTotalPicks >= (draftState.challenge.draftRounds * draftState.participants.length);

      if (isDraftComplete) {
        // Update challenge status to active
        await db
          .update(challenges)
          .set({ status: "active" })
          .where(eq(challenges.id, input.challengeId));
      }

      return {
        pick: pick[0],
        isDraftComplete,
      };
    }),

  /**
   * Auto-pick for a user (when timer expires or they request it)
   */
  autoPick: protectedProcedure
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

      // Get draft state
      const draftState = await challengeDraftRouter.createCaller({ user: ctx.user }).getDraftState({
        challengeId: input.challengeId,
      });

      if (!draftState.isUserTurn) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "It's not your turn to pick",
        });
      }

      // Determine which asset type to auto-pick based on roster needs
      const userPicks = draftState.picks.filter(p => p.userId === ctx.user.id);
      const assetTypeCounts = {
        manufacturer: userPicks.filter(p => p.assetType === "manufacturer").length,
        cannabis_strain: userPicks.filter(p => p.assetType === "cannabis_strain").length,
        pharmacy: userPicks.filter(p => p.assetType === "pharmacy").length,
        brand: userPicks.filter(p => p.assetType === "brand").length,
      };

      // Pick the type with fewest picks
      const assetType = Object.entries(assetTypeCounts).sort((a, b) => a[1] - b[1])[0][0] as any;

      // Get top available asset of that type
      const available = await challengeDraftRouter.createCaller({ user: ctx.user }).getAvailableAssets({
        challengeId: input.challengeId,
        assetType,
        limit: 1,
      });

      if (!available || available.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No available assets to auto-pick",
        });
      }

      // Make the pick
      return challengeDraftRouter.createCaller({ user: ctx.user }).makePick({
        challengeId: input.challengeId,
        assetType,
        assetId: available[0].id,
      });
    }),
});
