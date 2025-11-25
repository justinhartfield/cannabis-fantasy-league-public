import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { users, teams } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { bunnyStoragePut } from "./bunnyStorage";
import { applyReferralCodeForUser, getOrCreateReferralCode, getReferralStats } from "./referralService";

/**
 * Profile Router
 * Handles user profile operations including avatar management
 */

export const profileRouter = router({
  /**
   * Get Profile
   * Returns the current user's profile data
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),

  /**
   * Get Referral Info
   * Returns the user's referral code, credits, and streak freeze tokens
   */
  getReferralInfo: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        referralCode: users.referralCode,
        referralCredits: users.referralCredits,
        streakFreezeTokens: users.streakFreezeTokens,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const referralCode =
      user.referralCode || (await getOrCreateReferralCode(user.id)) || undefined;

    const stats = await getReferralStats(user.id);

    const invitePath = referralCode ? `/join?ref=${referralCode}` : null;

    return {
      referralCode: referralCode ?? null,
      referralCredits: user.referralCredits ?? 0,
      streakFreezeTokens: user.streakFreezeTokens ?? 0,
      invitePath,
      totalReferrals: stats.totalReferrals,
      completedReferrals: stats.completedReferrals,
    };
  }),

  /**
   * Update Profile
   * Updates user's name and/or email
   * Also syncs username changes to team names in existing leagues
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().max(320).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
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

      // Get the current user's name before update
      const [currentUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1);

      const oldName = currentUser?.name;

      // Build update object with only provided fields
      const updateData: any = {
        updatedAt: new Date().toISOString(),
      };

      if (input.name !== undefined) {
        updateData.name = input.name;
      }

      if (input.email !== undefined) {
        updateData.email = input.email;
      }

      try {
        // Update user profile
        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, ctx.user.id));

        // If name was updated, also update team names in leagues
        // This syncs the username across existing leagues
        if (input.name !== undefined && input.name !== oldName) {
          // Get all teams belonging to this user
          const userTeams = await db
            .select({ id: teams.id, name: teams.name })
            .from(teams)
            .where(eq(teams.userId, ctx.user.id));

          // Update team names that follow the pattern "{oldName}'s Team"
          // or any team name that contains the old username
          for (const team of userTeams) {
            let newTeamName = team.name;
            
            // If team name follows the pattern "X's Team", update it
            if (oldName && team.name === `${oldName}'s Team`) {
              newTeamName = `${input.name}'s Team`;
            }
            // Also update if team name exactly matches old username
            else if (oldName && team.name === oldName) {
              newTeamName = input.name;
            }
            
            // Only update if the name actually changed
            if (newTeamName !== team.name) {
              await db
                .update(teams)
                .set({ 
                  name: newTeamName,
                  updatedAt: new Date().toISOString(),
                })
                .where(eq(teams.id, team.id));
              
              console.log(`[ProfileRouter] Updated team ${team.id} name from "${team.name}" to "${newTeamName}"`);
            }
          }
        }

        return { success: true };
      } catch (error) {
        console.error("Profile update error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }
    }),

  /**
   * Apply Referral Code
   * Associates the current user with a referrer using a referral code
   */
  applyReferralCode: protectedProcedure
    .input(
      z.object({
        code: z.string().min(3).max(32),
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
        const normalizedCode = input.code.trim().toUpperCase();
        if (!normalizedCode) {
          return { success: false };
        }

        const result = await applyReferralCodeForUser(ctx.user.id, normalizedCode);

        switch (result.status) {
          case "applied":
            return { success: true };
          case "already_referred":
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "You have already used a referral code.",
            });
          case "already_has_teams":
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Referral codes can only be used before joining a league.",
            });
          case "invalid_code":
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid referral code.",
            });
          case "self_referral":
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "You cannot use your own referral code.",
            });
          case "user_not_found":
          case "db_unavailable":
          default:
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to apply referral code at this time.",
            });
        }

      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Apply referral code error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to apply referral code",
        });
      }
    }),

  /**
   * Upload Avatar
   * Handles avatar image upload and updates user's avatarUrl
   */
  uploadAvatar: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(), // Base64 encoded file data
        contentType: z.string(),
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
        // Validate file type
        const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
        if (!allowedTypes.includes(input.contentType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.",
          });
        }

        // Decode base64 data
        const buffer = Buffer.from(input.fileData, "base64");

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (buffer.length > maxSize) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File size exceeds 5MB limit.",
          });
        }

        // Generate unique file path
        const timestamp = Date.now();
        const fileExtension = input.fileName.split(".").pop() || "jpg";
        const storageKey = `avatars/${ctx.user.id}/${timestamp}.${fileExtension}`;

        // Upload to Bunny CDN storage
        const url = await bunnyStoragePut(storageKey, buffer, input.contentType);

        // Update user's avatarUrl in database
        await db
          .update(users)
          .set({
            avatarUrl: url,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, ctx.user.id));

        return {
          success: true,
          avatarUrl: url,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Avatar upload error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload avatar",
        });
      }
    }),

  /**
   * Delete Avatar
   * Removes the user's avatar by clearing the avatarUrl field
   */
  deleteAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    }

    try {
      await db
        .update(users)
        .set({
          avatarUrl: null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    } catch (error) {
      console.error("Avatar delete error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete avatar",
      });
    }
  }),
});
