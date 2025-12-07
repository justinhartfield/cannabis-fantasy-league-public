import { pgTable, serial, integer, varchar, text, timestamp, decimal, boolean, index, unique } from "drizzle-orm/pg-core";

// ============================================================================
// DISPENSARY TYCOON - GAME SCHEMA
// ============================================================================

/**
 * Player's dispensary - the core entity of the game
 */
export const dispensaries = pgTable("dispensaries", {
    id: serial().primaryKey(),
    userId: integer().notNull(),
    name: varchar({ length: 255 }).notNull(),
    level: integer().default(1).notNull(),

    // Currencies
    cashBalance: integer().default(10000).notNull(), // Starting cash in cents
    gemBalance: integer().default(10).notNull(),
    reputation: integer().default(100).notNull(), // 0-1000 scale

    // Lifetime stats
    totalRevenue: integer().default(0).notNull(),
    totalCustomers: integer().default(0).notNull(),
    totalSales: integer().default(0).notNull(),

    // Game state
    lastActiveAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    idleEarnings: integer().default(0).notNull(), // Uncollected idle revenue

    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        unique("dispensaries_user_unique").on(table.userId),
        index("dispensaries_level_idx").on(table.level),
        index("dispensaries_revenue_idx").on(table.totalRevenue),
    ]);

/**
 * Inventory - strains stocked in the dispensary
 */
export const dispensaryInventory = pgTable("dispensaryInventory", {
    id: serial().primaryKey(),
    dispensaryId: integer().notNull(),
    strainId: integer().notNull(),

    quantity: integer().default(0).notNull(), // Units in stock
    purchaseCostCents: integer().notNull(), // Cost per unit
    salePriceCents: integer().notNull(), // Player-set selling price

    // Stats for this strain at this dispensary
    totalSold: integer().default(0).notNull(),
    totalRevenue: integer().default(0).notNull(),

    lastRestocked: timestamp({ mode: 'string', withTimezone: true }),
    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        unique("dispensary_strain_unique").on(table.dispensaryId, table.strainId),
        index("inventory_dispensary_idx").on(table.dispensaryId),
        index("inventory_strain_idx").on(table.strainId),
    ]);

/**
 * Staff members working at the dispensary
 */
export const dispensaryStaff = pgTable("dispensaryStaff", {
    id: serial().primaryKey(),
    dispensaryId: integer().notNull(),

    role: varchar({ length: 50 }).notNull(), // 'budtender', 'grower', 'manager', 'security'
    name: varchar({ length: 255 }).notNull(),
    avatarUrl: varchar({ length: 500 }),
    level: integer().default(1).notNull(),

    // Staff stats
    salaryCents: integer().notNull(), // Daily salary
    bonusMultiplier: decimal({ precision: 4, scale: 2 }).default("1.00").notNull(),

    // Special abilities (JSON could be used here, but keeping simple)
    specialAbility: varchar({ length: 100 }),

    hiredAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    lastPaidAt: timestamp({ mode: 'string', withTimezone: true }),
    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        index("staff_dispensary_idx").on(table.dispensaryId),
        index("staff_role_idx").on(table.role),
    ]);

/**
 * Upgrades purchased for the dispensary
 */
export const dispensaryUpgrades = pgTable("dispensaryUpgrades", {
    id: serial().primaryKey(),
    dispensaryId: integer().notNull(),

    upgradeType: varchar({ length: 50 }).notNull(), // 'display_case', 'pos_system', 'waiting_area', 'grow_room', 'security_system'
    level: integer().default(1).notNull(),

    purchasedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        unique("dispensary_upgrade_unique").on(table.dispensaryId, table.upgradeType),
        index("upgrade_dispensary_idx").on(table.dispensaryId),
    ]);

/**
 * Sales history - each transaction
 */
export const dispensarySales = pgTable("dispensarySales", {
    id: serial().primaryKey(),
    dispensaryId: integer().notNull(),
    strainId: integer().notNull(),

    quantitySold: integer().notNull(),
    salePriceCents: integer().notNull(),
    totalRevenueCents: integer().notNull(),

    // Customer satisfaction for this sale (affects reputation)
    customerRating: integer(), // 1-5 stars

    soldAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        index("sales_dispensary_idx").on(table.dispensaryId),
        index("sales_date_idx").on(table.soldAt),
        index("sales_strain_idx").on(table.strainId),
    ]);

/**
 * Daily snapshots for leaderboards
 */
export const dispensaryDailyStats = pgTable("dispensaryDailyStats", {
    id: serial().primaryKey(),
    dispensaryId: integer().notNull(),
    statDate: varchar({ length: 10 }).notNull(), // YYYY-MM-DD format

    revenue: integer().default(0).notNull(),
    customers: integer().default(0).notNull(),
    salesCount: integer().default(0).notNull(),
    avgRating: decimal({ precision: 3, scale: 2 }).default("0.00"),

    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        unique("dispensary_daily_unique").on(table.dispensaryId, table.statDate),
        index("daily_stats_date_idx").on(table.statDate),
        index("daily_stats_revenue_idx").on(table.revenue),
    ]);

/**
 * Leaderboard entries
 */
export const leaderboards = pgTable("tycoonLeaderboards", {
    id: serial().primaryKey(),
    dispensaryId: integer().notNull(),
    userId: integer().notNull(),

    boardType: varchar({ length: 50 }).notNull(), // 'revenue_all_time', 'revenue_daily', 'customers_weekly', 'rating_monthly'
    score: integer().notNull(),
    rank: integer(),

    periodStart: varchar({ length: 10 }).notNull(), // YYYY-MM-DD
    periodEnd: varchar({ length: 10 }).notNull(),

    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        unique("leaderboard_entry_unique").on(table.boardType, table.periodStart, table.dispensaryId),
        index("leaderboard_type_idx").on(table.boardType),
        index("leaderboard_rank_idx").on(table.rank),
        index("leaderboard_score_idx").on(table.score),
    ]);

/**
 * Tournament entries
 */
export const tournaments = pgTable("tycoonTournaments", {
    id: serial().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),

    theme: varchar({ length: 100 }), // e.g., 'indica_week', 'sativa_showdown'
    entryFeeCents: integer().default(0).notNull(),
    prizePoolCents: integer().default(0).notNull(),

    startDate: varchar({ length: 10 }).notNull(),
    endDate: varchar({ length: 10 }).notNull(),
    status: varchar({ length: 50 }).default('upcoming').notNull(), // 'upcoming', 'active', 'completed'

    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        index("tournament_status_idx").on(table.status),
        index("tournament_dates_idx").on(table.startDate, table.endDate),
    ]);

export const tournamentParticipants = pgTable("tycoonTournamentParticipants", {
    id: serial().primaryKey(),
    tournamentId: integer().notNull(),
    dispensaryId: integer().notNull(),
    userId: integer().notNull(),

    score: integer().default(0).notNull(),
    rank: integer(),

    joinedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        unique("tournament_participant_unique").on(table.tournamentId, table.dispensaryId),
        index("tournament_participant_idx").on(table.tournamentId),
        index("tournament_score_idx").on(table.score),
    ]);

/**
 * Achievements for the tycoon game
 */
export const tycoonAchievements = pgTable("tycoonAchievements", {
    id: serial().primaryKey(),
    dispensaryId: integer().notNull(),
    userId: integer().notNull(),

    achievementType: varchar({ length: 100 }).notNull(),
    achievementName: varchar({ length: 255 }).notNull(),
    description: text(),
    iconUrl: varchar({ length: 500 }),

    // Rewards granted
    cashReward: integer().default(0),
    gemReward: integer().default(0),

    earnedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        unique("tycoon_achievement_unique").on(table.dispensaryId, table.achievementType),
        index("tycoon_achievement_dispensary_idx").on(table.dispensaryId),
        index("tycoon_achievement_type_idx").on(table.achievementType),
    ]);

/**
 * Daily login rewards
 */
export const dailyRewards = pgTable("tycoonDailyRewards", {
    id: serial().primaryKey(),
    userId: integer().notNull(),
    dispensaryId: integer().notNull(),

    rewardDate: varchar({ length: 10 }).notNull(),
    streakDay: integer().default(1).notNull(), // Day 1-7 of weekly streak

    cashReward: integer().default(0).notNull(),
    gemReward: integer().default(0).notNull(),

    claimedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
    (table) => [
        unique("daily_reward_unique").on(table.userId, table.rewardDate),
        index("daily_reward_user_idx").on(table.userId),
    ]);

// Type exports
export type Dispensary = typeof dispensaries.$inferSelect;
export type InsertDispensary = typeof dispensaries.$inferInsert;
export type DispensaryInventory = typeof dispensaryInventory.$inferSelect;
export type DispensaryStaff = typeof dispensaryStaff.$inferSelect;
export type DispensarySale = typeof dispensarySales.$inferSelect;
