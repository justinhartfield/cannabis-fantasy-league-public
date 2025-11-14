import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { leagues, teams, users, invitations } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { sendLeagueInvitation, sendWelcomeEmail } from "./emailService";
import { getRawClient } from './db';
// CUID should be removed
// import cuid from "cuid";

/**
 * Invitation Router
 * 
 * Handles league invitations:
 * - Creating and sending invitations
 * - Accepting/declining invitations
 * - Managing invitation status
 * - User registration from invitations
 */

interface Invitation {
  id: number;
  leagueId: number;
  email: string;
  token: string;
  invitedBy: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
  acceptedAt: Date | null;
}

/**
 * Generate a secure random token
 */
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get invitation expiration date (7 days from now)
 */
function getExpirationDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

export const invitationRouter = router({
  /**
   * Send league invitation
   */
  sendInvitation: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
      email: z.string().email(),
      recipientName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Check if user is league commissioner or member
      const league = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (league.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'League not found' });
      }

      const userTeam = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.leagueId, input.leagueId),
          eq(teams.userId, ctx.user.id)
        ))
        .limit(1);

      if (league[0].commissionerUserId !== ctx.user.id && userTeam.length === 0) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only league members can send invitations' });
      }

      // Check if email is already invited or a member
      const existingInvitationResult = await db.execute(sql`
        SELECT id FROM "invitations"
        WHERE "leagueId" = ${input.leagueId}
        AND "email" = ${input.email}
        AND "status" = 'pending'
        LIMIT 1
      `);

      if (existingInvitationResult.rows.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'User already has a pending invitation' });
      }

      // Check if user with this email already exists and is in the league
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser.length > 0) {
        const existingTeam = await db
          .select()
          .from(teams)
          .where(and(
            eq(teams.leagueId, input.leagueId),
            eq(teams.userId, existingUser[0].id)
          ))
          .limit(1);

        if (existingTeam.length > 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'User is already in this league' });
        }
      }

      // Generate invitation token
      const token = generateInvitationToken();
      const expiresAt = getExpirationDate();

      // Create invitation using Drizzle insert
      const [newInvitation] = await db
        .insert(invitations)
        .values({
          leagueId: input.leagueId,
          email: input.email,
          token: token,
          invitedBy: ctx.user.id,
          expiresAt: expiresAt,
          status: "pending",
          // The manual ID assignment should be removed
          // id: cuid(),
        })
        .returning({ id: invitations.id });
      
      const invitationId = newInvitation?.id;

      // Send invitation email
      const recipientName = input.recipientName || input.email.split('@')[0];
      await sendLeagueInvitation({
        toEmail: input.email,
        toName: recipientName,
        leagueName: league[0].name,
        inviterName: ctx.user.username || ctx.user.email,
        invitationToken: token,
        leagueId: input.leagueId,
      });

      return {
        success: true,
        invitationId,
        message: `Invitation sent to ${input.email}`,
      };
    }),

  /**
   * Get invitation by token (public - for accepting invitations)
   */
  getByToken: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      const invitationResult = await db.execute(sql`
        SELECT i.*, l."name" as "leagueName", u."name" as "inviterName", u."email" as "inviterEmail"
        FROM "invitations" i
        JOIN "leagues" l ON i."leagueId" = l."id"
        JOIN "users" u ON i."invitedBy" = u."id"
        WHERE i."token" = ${input.token}
        LIMIT 1
      `);

      if (!invitationResult.rows || invitationResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      }

      const inv = invitationResult.rows[0];

      // Check if expired
      if (new Date(inv.expiresAt) < new Date()) {
        await db.execute(sql`
          UPDATE "invitations"
          SET "status" = 'expired'
          WHERE "token" = ${input.token}
        `);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation has expired' });
      }

      // Check if already accepted/declined
      if (inv.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Invitation has been ${inv.status}` });
      }

      return {
        id: inv.id,
        leagueId: inv.leagueId,
        leagueName: inv.leagueName,
        email: inv.email,
        inviterName: inv.inviterName,
        inviterEmail: inv.inviterEmail,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      };
    }),

  /**
   * Accept invitation (creates team if user exists, or returns registration info)
   */
  acceptInvitation: publicProcedure
    .input(z.object({
      token: z.string(),
      teamName: z.string().min(1).max(50),
      // For new users
      username: z.string().min(3).max(30).optional(),
      password: z.string().min(6).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Get invitation
      const invitationResult = await db.execute(sql`
        SELECT *
        FROM "invitations"
        WHERE "token" = ${input.token}
        LIMIT 1
      `) as any;

      if (!invitationResult.rows || invitationResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      }

      const invitation = invitationResult.rows[0];

      // Check if expired
      if (new Date(invitation.expiresAt) < new Date()) {
        await db.execute(sql`
          UPDATE "invitations"
          SET "status" = 'expired'
          WHERE "token" = ${input.token}
        `);
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invitation has expired' });
      }

      // Check if already accepted
      if (invitation.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: `Invitation has been ${invitation.status}` });
      }

      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, invitation.email))
        .limit(1);

      let userId: number;

      if (existingUser.length > 0) {
        // Existing user
        userId = existingUser[0].id;
      } else {
        // New user - create account
        if (!input.username || !input.password) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Username and password required for new users' 
          });
        }

        // Check if username is taken
        const usernameExists = await db
          .select()
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1);

        if (usernameExists.length > 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Username already taken' });
        }

        // Create new user (password should be hashed in production)
        const userInsert = await db.execute(sql`
          INSERT INTO "users" ("email", "username", "password")
          VALUES (${invitation.email}, ${input.username}, ${input.password})
          RETURNING "id"
        `) as any;

        userId = userInsert.rows?.[0]?.id;

        // Send welcome email
        await sendWelcomeEmail({
          toEmail: invitation.email,
          toName: input.username,
        });
      }

      // Check if user already has a team in this league
      const existingTeam = await db
        .select()
        .from(teams)
        .where(and(
          eq(teams.leagueId, invitation.leagueId),
          eq(teams.userId, userId)
        ))
        .limit(1);

      if (existingTeam.length > 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'You already have a team in this league' });
      }

      // Create team
      const [teamResult] = await db.insert(teams).values({
        leagueId: invitation.leagueId,
        userId: userId,
        name: input.teamName,
        draftPosition: 0, // Will be set during draft
      }).returning({ id: teams.id });

      // Update invitation status
      await db.execute(sql`
        UPDATE "invitations"
        SET "status" = 'accepted', "acceptedAt" = NOW()
        WHERE "token" = ${input.token}
      `);

      // Get league type for redirect
      const leagueResult = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, invitation.leagueId))
        .limit(1);

      return {
        success: true,
        teamId: teamResult?.id,
        leagueId: invitation.leagueId,
        leagueType: leagueResult[0]?.leagueType || 'season',
        userId: userId,
        message: 'Successfully joined the league!',
      };
    }),

  /**
   * Decline invitation
   */
  declineInvitation: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      await db.execute(sql`
        UPDATE "invitations"
        SET "status" = 'declined'
        WHERE "token" = ${input.token} AND "status" = 'pending'
      `);

      return {
        success: true,
        message: 'Invitation declined',
      };
    }),

  /**
   * Get league invitations (for commissioner)
   */
  getLeagueInvitations: protectedProcedure
    .input(z.object({
      leagueId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Check if user is league commissioner
      const league = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, input.leagueId))
        .limit(1);

      if (league.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'League not found' });
      }

      if (league[0].commissionerUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only commissioner can view invitations' });
      }

      // Get invitations
      const invitationList = await db.execute(sql`
        SELECT i.*, u."name" as "inviterName"
        FROM "invitations" i
        JOIN "users" u ON i."invitedBy" = u."id"
        WHERE i."leagueId" = ${input.leagueId}
        ORDER BY i."createdAt" DESC
      `) as any;

      return invitationList.rows || [];
    }),

  /**
   * Resend invitation
   */
  resendInvitation: protectedProcedure
    .input(z.object({
      invitationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Get invitation
      const invitationResult = await db.execute(sql`
        SELECT i.*, l."name" as "leagueName"
        FROM "invitations" i
        JOIN "leagues" l ON i."leagueId" = l."id"
        WHERE i."id" = ${input.invitationId}
        LIMIT 1
      `) as any;

      if (!invitationResult.rows || invitationResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      }

      const invitation = invitationResult.rows[0];

      // Check if user is league commissioner
      const league = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, invitation.leagueId))
        .limit(1);

      if (league[0].commissionerUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only commissioner can resend invitations' });
      }

      // Only resend pending invitations
      if (invitation.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Can only resend pending invitations' });
      }

      // Update expiration date
      const newExpiresAt = getExpirationDate();
      await db.execute(sql`
        UPDATE "invitations"
        SET "expiresAt" = ${newExpiresAt}
        WHERE "id" = ${input.invitationId}
      `);

      // Resend email
      await sendLeagueInvitation({
        toEmail: invitation.email,
        toName: invitation.email.split('@')[0],
        leagueName: invitation.leagueName,
        inviterName: ctx.user.username || ctx.user.email,
        invitationToken: invitation.token,
        leagueId: invitation.leagueId,
      });

      return {
        success: true,
        message: `Invitation resent to ${invitation.email}`,
      };
    }),

  /**
   * Cancel invitation
   */
  cancelInvitation: protectedProcedure
    .input(z.object({
      invitationId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      }

      // Get invitation
      const invitationResult = await db.execute(sql`
        SELECT *
        FROM "invitations"
        WHERE "id" = ${input.invitationId}
        LIMIT 1
      `) as any;

      if (!invitationResult.rows || invitationResult.rows.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invitation not found' });
      }

      const invitation = invitationResult.rows[0];

      // Check if user is league commissioner
      const league = await db
        .select()
        .from(leagues)
        .where(eq(leagues.id, invitation.leagueId))
        .limit(1);

      if (league[0].commissionerUserId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only commissioner can cancel invitations' });
      }

      // Delete invitation
      await db.execute(sql`
        DELETE FROM "invitations" WHERE "id" = ${input.invitationId}
      `);

      return {
        success: true,
        message: 'Invitation cancelled',
      };
    }),
});
