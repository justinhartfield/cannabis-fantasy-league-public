/**
 * Portfolio Duels Schema
 * 
 * 1v1 multiplayer draft battles where players compete by selecting
 * cannabis market assets (strains, manufacturers, products, pharmacies)
 */

import { pgTable, serial, integer, varchar, decimal, timestamp, date, index, unique, boolean } from "drizzle-orm/pg-core";
import { users } from "./schema";

// Duel Types
export type DuelType = 'sprint'; // 24h - V1 only, can add 'standard' (48h) and 'weekend' later
export type DuelStatus = 'pending' | 'matchmaking' | 'drafting' | 'active' | 'complete' | 'cancelled';
export type DuelPosition = 'STRAIN_1' | 'STRAIN_2' | 'MANUFACTURER' | 'PRODUCT' | 'PHARMACY';

// Main Duel Table
export const portfolioDuels = pgTable("portfolioDuels", {
    id: serial().primaryKey(),

    // Players
    creatorId: integer().notNull().references(() => users.id),
    opponentId: integer().references(() => users.id), // Null until matched

    // Duel Settings
    duelType: varchar({ length: 20 }).default('sprint').notNull(), // 'sprint' = 24h
    status: varchar({ length: 20 }).default('pending').notNull(),

    // Stakes (BudsRewards points)
    anteAmount: integer().default(100).notNull(), // Points each player puts in
    prizePool: integer().default(200).notNull(),  // Total prize for winner

    // Results
    winnerId: integer().references(() => users.id),
    creatorFinalScore: decimal({ precision: 10, scale: 2 }),
    opponentFinalScore: decimal({ precision: 10, scale: 2 }),

    // Timing
    draftStartedAt: timestamp({ mode: 'string', withTimezone: true }),
    startTime: timestamp({ mode: 'string', withTimezone: true }), // When duel goes active
    endTime: timestamp({ mode: 'string', withTimezone: true }),   // When duel completes

    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("duel_creator_idx").on(table.creatorId),
    index("duel_opponent_idx").on(table.opponentId),
    index("duel_status_idx").on(table.status),
]);

// Duel Picks - 5 per player (10 total per duel)
export const portfolioDuelPicks = pgTable("portfolioDuelPicks", {
    id: serial().primaryKey(),
    duelId: integer().notNull().references(() => portfolioDuels.id, { onDelete: 'cascade' }),
    userId: integer().notNull().references(() => users.id),

    // Position being filled
    position: varchar({ length: 20 }).notNull(), // STRAIN_1, STRAIN_2, MANUFACTURER, PRODUCT, PHARMACY

    // Asset selected
    assetType: varchar({ length: 20 }).notNull(), // 'strain', 'manufacturer', 'product', 'pharmacy'
    assetId: integer().notNull(),
    assetName: varchar({ length: 255 }), // Cached for display

    // Scoring
    startScore: decimal({ precision: 10, scale: 2 }), // Score at duel start
    endScore: decimal({ precision: 10, scale: 2 }),   // Score at duel end
    scoreChange: decimal({ precision: 10, scale: 2 }), // End - Start
    pointsEarned: decimal({ precision: 10, scale: 2 }), // After multiplier applied

    // Metadata
    pickOrder: integer(), // Order in which pick was made (1-5)
    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("duel_pick_duel_idx").on(table.duelId),
    index("duel_pick_user_idx").on(table.userId),
    unique("duel_pick_position_unique").on(table.duelId, table.userId, table.position),
    unique("duel_pick_asset_unique").on(table.duelId, table.assetType, table.assetId), // No duplicate assets in same duel
]);

// Duel Invitations - for friend challenges
export const portfolioDuelInvites = pgTable("portfolioDuelInvites", {
    id: serial().primaryKey(),
    senderId: integer().notNull().references(() => users.id),
    receiverId: integer().notNull().references(() => users.id),

    // Duel settings
    duelType: varchar({ length: 20 }).default('sprint').notNull(),
    anteAmount: integer().default(100).notNull(),

    // Status
    status: varchar({ length: 20 }).default('pending').notNull(), // 'pending', 'accepted', 'declined', 'expired'
    duelId: integer().references(() => portfolioDuels.id), // Set when accepted

    // Timing
    expiresAt: timestamp({ mode: 'string', withTimezone: true }).notNull(),
    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("invite_sender_idx").on(table.senderId),
    index("invite_receiver_idx").on(table.receiverId),
    index("invite_status_idx").on(table.status),
]);

// Matchmaking Queue - for quick match
export const portfolioDuelQueue = pgTable("portfolioDuelQueue", {
    id: serial().primaryKey(),
    userId: integer().notNull().references(() => users.id),
    anteAmount: integer().notNull(),
    duelType: varchar({ length: 20 }).default('sprint').notNull(),
    joinedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("queue_ante_idx").on(table.anteAmount),
    unique("queue_user_unique").on(table.userId), // One queue entry per user
]);

// Duel Leaderboard (aggregated stats)
export const portfolioDuelStats = pgTable("portfolioDuelStats", {
    id: serial().primaryKey(),
    userId: integer().notNull().references(() => users.id),

    // Record
    totalDuels: integer().default(0).notNull(),
    wins: integer().default(0).notNull(),
    losses: integer().default(0).notNull(),
    draws: integer().default(0).notNull(),

    // Points
    totalPointsWon: integer().default(0).notNull(),
    totalPointsLost: integer().default(0).notNull(),
    netPoints: integer().default(0).notNull(),

    // Streaks
    currentWinStreak: integer().default(0).notNull(),
    longestWinStreak: integer().default(0).notNull(),

    updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    unique("duel_stats_user_unique").on(table.userId),
    index("duel_stats_wins_idx").on(table.wins),
    index("duel_stats_net_idx").on(table.netPoints),
]);

// Position multipliers for scoring
export const POSITION_MULTIPLIERS: Record<DuelPosition, number> = {
    STRAIN_1: 1.5,      // Star pick
    STRAIN_2: 1.0,      // Second strain
    MANUFACTURER: 1.2,  // Stable bet
    PRODUCT: 2.0,       // High risk/reward
    PHARMACY: 1.3,      // Location bet
};

// Duel duration in hours
export const DUEL_DURATIONS: Record<DuelType, number> = {
    sprint: 24,
};
