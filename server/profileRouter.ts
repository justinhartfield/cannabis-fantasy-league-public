import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { bunnyStoragePut } from "./bunnyStorage";

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
   * Update Profile
   * Updates user's name and/or email
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
        await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, ctx.user.id));

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
