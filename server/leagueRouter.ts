import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { leagues, teams, users } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { wsManager } from "./websocket";
import { completeReferralIfEligible } from "./referralService";

/**
 * Generate a random 6-character alphanumeric league code
 */
function generateLeagueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar-looking characters
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * League Router
 * Handles all league management operations for Season Mode
 */

export const leagueRouter = router({
  /**
   * Create a new league
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(100),
        description: z.string().max(500).optional(),
        maxTeams: z.number().min(2).max(16).default(10),
        draftDate: z.string().optional().transform(val => val === "" ? undefined : val),
        scoringSystem: z.enum(["standard", "ppr", "custom"]).default("standard"),
        waiverType: z.enum(["faab", "rolling"]).default("faab"),
        faabBudget: z.number().min(0).max(1000).default(100),
        tradeDeadlineWeek: z.number().min(1).max(18).default(13),
        playoffTeams: z.number().min(2).max(8).default(6),
        seasonLength: z.number().min(4).max(52).default(18),
        isPublic: z.boolean().default(false),
        leagueType: z.enum(["season", "challenge"]).default("season"),
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

      try {
        // Generate unique league code
        let leagueCode = generateLeagueCode();
        let codeExists = true;
        
        // Ensure code is unique
        while (codeExists) {
          const existing = await db.select().from(leagues).where(eq(leagues.leagueCode, leagueCode)).limit(1);
          if (existing.length === 0) {
            codeExists = false;
          } else {
            leagueCode = generateLeagueCode();
          }
        }

        // Create league
        const currentYear = new Date().getFullYear();
        // Calculate playoff start week: Season length + 1
        // e.g., 4 week season -> playoffs start week 5
        const playoffStartWeek = input.seasonLength + 1;
        
        const leagueResult = await db
          .insert(leagues)
          .values({
            name: input.name,
            commissionerUserId: ctx.user.id,
            teamCount: input.maxTeams,
            currentWeek: 1,
            status: "draft",
            draftDate: input.draftDate ? new Date(input.draftDate) : null,
            scoringType: input.scoringSystem === "standard" ? "standard" : "custom",
            playoffTeams: input.playoffTeams,
            playoffStartWeek: input.seasonLength + 1,
            seasonYear: currentYear,
            leagueCode: leagueCode,
            leagueType: input.leagueType,
            isPublic: input.isPublic,
            playoffStartWeek: playoffStartWeek,
          })
          .returning({ id: leagues.id });

        const leagueId = leagueResult[0].id;
        console.log('[LeagueRouter] leagueResult:', leagueResult);
        console.log('[LeagueRouter] leagueId:', leagueId);

        // Create commissioner's team
        await db.insert(teams).values({
          leagueId: leagueId,
          userId: ctx.user.id,
          name: `${ctx.user.name}'s Team`,
          faabBudget: input.faabBudget,
        });

        // If this user was referred, complete the referral when they create their first league
        await completeReferralIfEligible(ctx.user.id);

        return {
          success: true,
          leagueId: leagueId,
          leagueType: input.leagueType,
        };
      } catch (error) {
        console.error("[LeagueRouter] Error creating league:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to create league: ${errorMessage}`,
        });
      }
    }),

  /**
   * Get all leagues for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    try {
      // Get leagues where user has a team
      const userTeams = await db
        .select({
          league: leagues,
          team: teams,
        })
        .from(teams)
        .innerJoin(leagues, eq(teams.leagueId, leagues.id))
        .where(eq(teams.userId, ctx.user.id))
        .orderBy(desc(leagues.createdAt));

      return userTeams.map((ut) => ({
        ...ut.league,
        myTeam: ut.team,
      }));
    } catch (error) {
      console.error("[LeagueRouter] Error fetching user leagues:", error);
      return [];
    }
  }),

  /**
   * Get league details by ID
   */
  getById: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const [league] = await db
          .select()
          .from(leagues)
          .where(eq(leagues.id, input.leagueId))
          .limit(1);

        if (!league) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "League not found",
          });
        }

        // Get all teams in the league
        const leagueTeams = await db
          .select({
            team: teams,
            user: users,
          })
          .from(teams)
          .innerJoin(users, eq(teams.userId, users.id))
          .where(eq(teams.leagueId, input.leagueId))
          .orderBy(desc(teams.pointsFor));

        // Check if current user is in this league
        const userTeam = leagueTeams.find((t) => t.team.userId === ctx.user.id);

        return {
          ...league,
          teams: leagueTeams.map((t) => ({
            ...t.team,
            userName: t.user.name,
            userEmail: t.user.email,
            userAvatarUrl: t.user.avatarUrl,
            fighterIllustration: t.team.fighterIllustration,
          })),
          isCommissioner: league.commissionerUserId === ctx.user.id,
          isMember: !!userTeam,
          myTeam: userTeam?.team,
        };
      } catch (error) {
        console.error("[LeagueRouter] Error fetching league:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch league",
        });
      }
    }),

  /**
   * Join a league
   */
  join: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        teamName: z.string().min(3).max(50),
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

      try {
        // Check if league exists and has space
        const [league] = await db
          .select()
          .from(leagues)
          .where(eq(leagues.id, input.leagueId))
          .limit(1);

        if (!league) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "League not found",
          });
        }

        // Count current teams
        const currentTeams = await db
          .select()
          .from(teams)
          .where(eq(teams.leagueId, input.leagueId));

        if (currentTeams.length >= league.maxTeams) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "League is full",
          });
        }

        // Check if user already has a team in this league
        const existingTeam = currentTeams.find((t) => t.userId === ctx.user.id);
        if (existingTeam) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You already have a team in this league",
          });
        }

        // Create team
        await db.insert(teams).values({
          leagueId: input.leagueId,
          userId: ctx.user.id,
          teamName: input.teamName,
          faabRemaining: league.faabBudget,
        });

        // Complete referral for this user when they join their first league
        await completeReferralIfEligible(ctx.user.id);

        // Broadcast participant joined event for real-time updates
        wsManager.broadcastToLeague(input.leagueId, {
          type: 'participant_joined',
          leagueId: input.leagueId,
          userId: ctx.user.id,
          userName: ctx.user.name,
          teamName: input.teamName,
        });

        return {
          success: true,
        };
      } catch (error) {
        console.error("[LeagueRouter] Error joining league:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to join league",
        });
      }
    }),

  /**
   * Join a league by invite code
   */
  joinByCode: protectedProcedure
    .input(
      z.object({
        leagueCode: z.string().length(6),
        teamName: z.string().min(3).max(50).optional(),
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

      try {
        // Find league by code
        const [league] = await db
          .select()
          .from(leagues)
          .where(eq(leagues.leagueCode, input.leagueCode))
          .limit(1);

        if (!league) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Liga nicht gefunden. Überprüfe den Code.",
          });
        }

        // Count current teams
        const currentTeams = await db
          .select()
          .from(teams)
          .where(eq(teams.leagueId, league.id));

        if (currentTeams.length >= league.teamCount) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Liga ist voll",
          });
        }

        // Check if user already has a team in this league
        const existingTeam = currentTeams.find((t) => t.userId === ctx.user.id);
        if (existingTeam) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Du hast bereits ein Team in dieser Liga",
          });
        }

        // Create team with default name if not provided
        const teamName = input.teamName || `${ctx.user.name}'s Team`;
        const [newTeam] = await db.insert(teams).values({
          leagueId: league.id,
          userId: ctx.user.id,
          name: teamName,
          faabBudget: 100, // Default FAAB budget
        }).returning();

        // Complete referral for this user when they join their first league
        await completeReferralIfEligible(ctx.user.id);

        // Check if this is a challenge and now has 2 teams
        const allTeams = await db
          .select()
          .from(teams)
          .where(eq(teams.leagueId, league.id));

        if (league.leagueType === 'challenge' && allTeams.length === 2) {
          // Trigger coin flip and draft setup
          const coinFlip = Math.random() < 0.5;
          const firstTeam = coinFlip ? allTeams[0] : allTeams[1];
          const secondTeam = coinFlip ? allTeams[1] : allTeams[0];

          // Assign draft positions
          await db.update(teams)
            .set({ draftPosition: 1 })
            .where(eq(teams.id, firstTeam.id));
          
          await db.update(teams)
            .set({ draftPosition: 2 })
            .where(eq(teams.id, secondTeam.id));

          // Broadcast to both players
          wsManager.broadcastToLeague(league.id, {
            type: 'second_player_joined',
            leagueId: league.id,
            team1: { id: allTeams[0].id, name: allTeams[0].name },
            team2: { id: allTeams[1].id, name: allTeams[1].name },
          });

          // Delay coin flip result for animation timing
          setTimeout(() => {
            wsManager.broadcastToLeague(league.id, {
              type: 'coin_flip_result',
              leagueId: league.id,
              winnerTeamId: firstTeam.id,
              winnerTeamName: firstTeam.name,
              loserTeamId: secondTeam.id,
              loserTeamName: secondTeam.name,
            });
          }, 500);
        } else {
          // For non-challenge leagues, broadcast participant joined event
          wsManager.broadcastToLeague(league.id, {
            type: 'participant_joined',
            leagueId: league.id,
            userId: ctx.user.id,
            userName: ctx.user.name,
            teamName: teamName,
          });
        }

        return {
          success: true,
          leagueId: league.id,
          leagueType: league.leagueType,
        };
      } catch (error) {
        console.error("[LeagueRouter] Error joining league by code:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Fehler beim Beitreten der Liga",
        });
      }
    }),

  /**
   * Get public leagues available to join
   */
  public: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }

    try {
      const publicLeagues = await db
        .select()
        .from(leagues)
        .where(and(eq(leagues.isPublic, true), eq(leagues.seasonStatus, "pre_draft")))
        .orderBy(desc(leagues.createdAt))
        .limit(20);

      // Get team counts for each league
      const leaguesWithCounts = await Promise.all(
        publicLeagues.map(async (league) => {
          const teamCount = await db
            .select()
            .from(teams)
            .where(eq(teams.leagueId, league.id));

          return {
            ...league,
            currentTeams: teamCount.length,
            spotsAvailable: league.maxTeams - teamCount.length,
          };
        })
      );

      return leaguesWithCounts.filter((l) => l.spotsAvailable > 0);
    } catch (error) {
      console.error("[LeagueRouter] Error fetching public leagues:", error);
      return [];
    }
  }),

  /**
   * Update league settings (commissioner only)
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        name: z.string().min(3).max(100).optional(),
        description: z.string().max(500).optional(),
        draftDate: z.string().optional().transform(val => val === "" ? undefined : val),
        tradeDeadlineWeek: z.number().min(1).max(18).optional(),
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

      try {
        // Check if user is commissioner
        const [league] = await db
          .select()
          .from(leagues)
          .where(eq(leagues.id, input.leagueId))
          .limit(1);

        if (!league) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "League not found",
          });
        }

        if (league.commissionerUserId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the commissioner can update league settings",
          });
        }

        // Update league
        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.draftDate) updateData.draftDate = new Date(input.draftDate);
        if (input.tradeDeadlineWeek) updateData.tradeDeadlineWeek = input.tradeDeadlineWeek;

        await db.update(leagues).set(updateData).where(eq(leagues.id, input.leagueId));

        return {
          success: true,
        };
      } catch (error) {
        console.error("[LeagueRouter] Error updating league:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update league",
        });
      }
    }),

  /**
   * Delete league (commissioner only, pre-draft only)
   */
  delete: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Check if user is commissioner
        const [league] = await db
          .select()
          .from(leagues)
          .where(eq(leagues.id, input.leagueId))
          .limit(1);

        if (!league) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "League not found",
          });
        }

        if (league.commissionerUserId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the commissioner can delete the league",
          });
        }

        if (league.seasonStatus !== "pre_draft") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Can only delete leagues that haven't started",
          });
        }

        // Delete all teams first
        await db.delete(teams).where(eq(teams.leagueId, input.leagueId));

        // Delete league
        await db.delete(leagues).where(eq(leagues.id, input.leagueId));

        return {
          success: true,
        };
      } catch (error) {
        console.error("[LeagueRouter] Error deleting league:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete league",
        });
      }
    }),

  /**
   * Get current user's team in a league
   */
  getMyTeam: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const [team] = await db
          .select()
          .from(teams)
          .where(and(eq(teams.leagueId, input.leagueId), eq(teams.userId, ctx.user.id)))
          .limit(1);

        return team || null;
      } catch (error) {
        console.error("[LeagueRouter] Error fetching user team:", error);
        return null;
      }
    }),

  /**
   * Randomize draft order for a league
   * Only commissioner can do this
   */
  randomizeDraftOrder: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Check if user is commissioner
        const [league] = await db
          .select()
          .from(leagues)
          .where(eq(leagues.id, input.leagueId))
          .limit(1);

        if (!league) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "League not found",
          });
        }

        if (league.commissionerUserId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the commissioner can randomize draft order",
          });
        }

        // Get all teams in the league
        const leagueTeams = await db
          .select()
          .from(teams)
          .where(eq(teams.leagueId, input.leagueId));

        if (leagueTeams.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No teams in league to randomize",
          });
        }

        // Shuffle teams using Fisher-Yates algorithm
        const shuffled = [...leagueTeams];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Assign draft positions
        for (let i = 0; i < shuffled.length; i++) {
          await db
            .update(teams)
            .set({ draftPosition: i + 1 })
            .where(eq(teams.id, shuffled[i].id));
        }

        console.log(`[LeagueRouter] Randomized draft order for league ${input.leagueId}`);
        return { success: true, teamCount: shuffled.length };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[LeagueRouter] Error randomizing draft order:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to randomize draft order",
        });
      }
    }),

  /**
   * Set custom draft order for a league
   * Only commissioner can do this
   */
  setDraftOrder: protectedProcedure
    .input(
      z.object({
        leagueId: z.number(),
        teamOrder: z.array(z.number()), // Array of team IDs in desired order
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

      try {
        // Check if user is commissioner
        const [league] = await db
          .select()
          .from(leagues)
          .where(eq(leagues.id, input.leagueId))
          .limit(1);

        if (!league) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "League not found",
          });
        }

        if (league.commissionerUserId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the commissioner can set draft order",
          });
        }

        // Verify all teams belong to the league
        const leagueTeams = await db
          .select()
          .from(teams)
          .where(eq(teams.leagueId, input.leagueId));

        const leagueTeamIds = new Set(leagueTeams.map((t) => t.id));
        const invalidTeams = input.teamOrder.filter((id) => !leagueTeamIds.has(id));

        if (invalidTeams.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Some teams do not belong to this league",
          });
        }

        if (input.teamOrder.length !== leagueTeams.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Team order must include all teams in the league",
          });
        }

        // Assign draft positions
        for (let i = 0; i < input.teamOrder.length; i++) {
          await db
            .update(teams)
            .set({ draftPosition: i + 1 })
            .where(eq(teams.id, input.teamOrder[i]));
        }

        console.log(`[LeagueRouter] Set custom draft order for league ${input.leagueId}`);
        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[LeagueRouter] Error setting draft order:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set draft order",
        });
      }
    }),

  /**
   * Get draft order for a league
   */
  getDraftOrder: protectedProcedure
    .input(z.object({ leagueId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        const leagueTeams = await db
          .select({
            id: teams.id,
            name: teams.name,
            draftPosition: teams.draftPosition,
            userId: teams.userId,
            userName: users.name,
            userAvatarUrl: users.avatarUrl,
          })
          .from(teams)
          .leftJoin(users, eq(teams.userId, users.id))
          .where(eq(teams.leagueId, input.leagueId))
          .orderBy(teams.draftPosition);

        return leagueTeams;
      } catch (error) {
        console.error("[LeagueRouter] Error fetching draft order:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch draft order",
        });
      }
    }),

  /**
   * Get rematch info for a completed challenge
   */
  getChallengeRematchInfo: protectedProcedure
    .input(z.object({ challengeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Get challenge
        const [challenge] = await db
          .select()
          .from(leagues)
          .where(and(
            eq(leagues.id, input.challengeId),
            eq(leagues.leagueType, 'challenge')
          ))
          .limit(1);

        if (!challenge) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Challenge not found",
          });
        }

        // Get teams
        const challengeTeams = await db
          .select({
            id: teams.id,
            name: teams.name,
            userId: teams.userId,
            userName: users.name,
          })
          .from(teams)
          .leftJoin(users, eq(teams.userId, users.id))
          .where(eq(teams.leagueId, input.challengeId));

        if (challengeTeams.length !== 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Challenge must have exactly 2 teams",
          });
        }

        // Get final scores
        const year = new Date(challenge.createdAt).getFullYear();
        const week = Math.ceil((new Date(challenge.createdAt).getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

        const scores = await Promise.all(
          challengeTeams.map(async (team) => {
            const [score] = await db
              .select()
              .from(teams)
              .where(eq(teams.id, team.id))
              .limit(1);
            // Note: We'll get actual scores from weeklyTeamScores if needed
            return {
              teamId: team.id,
              teamName: team.name,
              userId: team.userId,
              userName: team.userName,
            };
          })
        );

        // Find opponent (the other team)
        const opponent = challengeTeams.find(t => t.userId !== ctx.user.id);

        return {
          challengeId: challenge.id,
          challengeName: challenge.name,
          opponent: opponent ? {
            teamId: opponent.id,
            teamName: opponent.name,
            userId: opponent.userId,
            userName: opponent.userName,
          } : null,
          myTeam: challengeTeams.find(t => t.userId === ctx.user.id) ? {
            teamId: challengeTeams.find(t => t.userId === ctx.user.id)!.id,
            teamName: challengeTeams.find(t => t.userId === ctx.user.id)!.name,
          } : null,
          challengeDate: challenge.createdAt,
          status: challenge.status,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[LeagueRouter] Error fetching rematch info:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch rematch info",
        });
      }
    }),

  /**
   * Create a rematch challenge with the same opponent
   */
  createRematchChallenge: protectedProcedure
    .input(z.object({ originalChallengeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      try {
        // Get original challenge
        const [originalChallenge] = await db
          .select()
          .from(leagues)
          .where(and(
            eq(leagues.id, input.originalChallengeId),
            eq(leagues.leagueType, 'challenge')
          ))
          .limit(1);

        if (!originalChallenge) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Original challenge not found",
          });
        }

        // Get teams from original challenge
        const originalTeams = await db
          .select()
          .from(teams)
          .where(eq(teams.leagueId, input.originalChallengeId));

        if (originalTeams.length !== 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Original challenge must have exactly 2 teams",
          });
        }

        // Verify user is one of the participants
        const userTeam = originalTeams.find(t => t.userId === ctx.user.id);
        if (!userTeam) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You are not a participant in this challenge",
          });
        }

        // Generate unique league code
        let leagueCode = generateLeagueCode();
        let codeExists = true;
        
        while (codeExists) {
          const existing = await db.select().from(leagues).where(eq(leagues.leagueCode, leagueCode)).limit(1);
          if (existing.length === 0) {
            codeExists = false;
          } else {
            leagueCode = generateLeagueCode();
          }
        }

        // Generate challenge name for today
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0];
        const challengeName = `Daily Challenge - ${dateStr}`;

        const currentYear = date.getFullYear();
        const currentWeek = Math.ceil((Date.now() - new Date(currentYear, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));

        // Create new challenge
        const [newChallenge] = await db
          .insert(leagues)
          .values({
            name: challengeName,
            leagueCode: leagueCode,
            commissionerUserId: ctx.user.id,
            teamCount: 2,
            draftType: 'none',
            scoringType: 'standard',
            playoffTeams: 0,
            seasonYear: currentYear,
            currentWeek: currentWeek,
            status: 'active',
            leagueType: 'challenge',
            draftStarted: 1,
            draftCompleted: 1,
          })
          .returning({ id: leagues.id });

        // Create teams for both participants
        for (const team of originalTeams) {
          await db.insert(teams).values({
            leagueId: newChallenge.id,
            userId: team.userId,
            name: team.name,
          });
        }

        console.log(`[LeagueRouter] Created rematch challenge ${newChallenge.id} from challenge ${input.originalChallengeId}`);

        return {
          success: true,
          leagueId: newChallenge.id,
          leagueType: 'challenge',
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[LeagueRouter] Error creating rematch challenge:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create rematch challenge",
        });
      }
    }),

  /**
   * Update team fighter illustration
   * Allows a user to select their "fighter" mascot for daily challenges
   */
  updateTeamFighter: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        fighterIllustration: z.string().max(100),
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

      try {
        // Verify the user owns this team
        const [team] = await db
          .select()
          .from(teams)
          .where(eq(teams.id, input.teamId))
          .limit(1);

        if (!team) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Team not found",
          });
        }

        if (team.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update your own team's fighter",
          });
        }

        // Update the fighter illustration
        await db
          .update(teams)
          .set({ 
            fighterIllustration: input.fighterIllustration,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(teams.id, input.teamId));

        console.log(`[LeagueRouter] Updated fighter illustration for team ${input.teamId}: ${input.fighterIllustration}`);

        return {
          success: true,
          teamId: input.teamId,
          fighterIllustration: input.fighterIllustration,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[LeagueRouter] Error updating team fighter:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update team fighter",
        });
      }
    }),
});
