import { pgTable, serial, varchar, text, integer, boolean, timestamp, date, index, unique, jsonb } from "drizzle-orm/pg-core";

// Public Mode: Legendary Strains
// Curated classic strains with tier ratings
export const publicLegendaryStrains = pgTable("publicLegendaryStrains", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull(),
  description: text(),
  tier: varchar({ length: 50 }).notNull(), // 'legendary', 'elite', 'classic'
  imageUrl: varchar({ length: 500 }),
  genetics: varchar({ length: 100 }), // 'Indica', 'Sativa', 'Hybrid', etc.
  thcRange: varchar({ length: 50 }), // e.g., '25-30%'
  dominantTerpenes: jsonb(), // Array of terpene names
  totalOrders: integer().default(0).notNull(),
  uniqueUsers: integer().default(0).notNull(),
  isActive: boolean().default(true).notNull(),
  createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
  (table) => [
    index("legendary_strain_name_idx").on(table.name),
    unique("legendary_strain_slug_unique").on(table.slug),
  ]);

// Public Mode: Trending Strains
// Daily trending strain snapshots with WoW deltas
export const publicTrendingStrains = pgTable("publicTrendingStrains", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull(),
  description: text(),
  imageUrl: varchar({ length: 500 }),
  genetics: varchar({ length: 100 }),
  thcRange: varchar({ length: 50 }),
  dominantTerpenes: jsonb(),
  todayOrders: integer().default(0).notNull(),
  yesterdayOrders: integer().default(0).notNull(),
  weekOverWeekDelta: integer().default(0).notNull(), // WoW growth percentage
  weekOverWeekPercentage: integer().default(0).notNull(), // WoW growth percentage
  uniqueUsers: integer().default(0).notNull(),
  trendScore: integer().default(0).notNull(), // Calculated trend score
  isViral: boolean().default(false).notNull(), // >50% WoW growth
  streakDays: integer().default(0).notNull(), // Consecutive days trending up
  snapshotDate: date({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
  (table) => [
    index("trending_strain_date_idx").on(table.snapshotDate),
    index("trending_strain_score_idx").on(table.trendScore),
    unique("trending_strain_slug_date_unique").on(table.slug, table.snapshotDate),
  ]);

// Public Mode: Effect Categories
// Aggregated effect performance stats
export const publicEffectCategories = pgTable("publicEffectCategories", {
  id: serial().primaryKey(),
  effectName: varchar({ length: 100 }).notNull(), // 'Euphoric', 'Relaxed', 'Creative', etc.
  slug: varchar({ length: 100 }).notNull(),
  description: text(),
  iconUrl: varchar({ length: 500 }),
  todayCount: integer().default(0).notNull(), // Number of orders with this effect today
  yesterdayCount: integer().default(0).notNull(),
  weekOverWeekDelta: integer().default(0).notNull(),
  weekOverWeekPercentage: integer().default(0).notNull(),
  totalStrains: integer().default(0).notNull(), // Number of strains with this effect
  avgRating: integer().default(0).notNull(), // Average user rating for this effect
  popularityRank: integer().default(0).notNull(), // Rank among all effects
  snapshotDate: date({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
  (table) => [
    index("effect_category_date_idx").on(table.snapshotDate),
    index("effect_category_rank_idx").on(table.popularityRank),
    unique("effect_category_slug_date_unique").on(table.slug, table.snapshotDate),
  ]);

// Public Mode: Consumption Types
// Genetics/THC/ProductType aggregates
export const publicConsumptionTypes = pgTable("publicConsumptionTypes", {
  id: serial().primaryKey(),
  categoryType: varchar({ length: 50 }).notNull(), // 'genetics', 'thc', 'productType'
  categoryValue: varchar({ length: 100 }).notNull(), // e.g., 'Hybrid Indica-dominant', 'Very High (25-30)', 'Flower'
  slug: varchar({ length: 100 }).notNull(),
  description: text(),
  iconUrl: varchar({ length: 500 }),
  todayCount: integer().default(0).notNull(),
  yesterdayCount: integer().default(0).notNull(),
  weekOverWeekDelta: integer().default(0).notNull(),
  weekOverWeekPercentage: integer().default(0).notNull(),
  marketSharePercentage: integer().default(0).notNull(), // Percentage of total market
  totalProducts: integer().default(0).notNull(), // Number of products in this category
  uniqueUsers: integer().default(0).notNull(),
  snapshotDate: date({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
  (table) => [
    index("consumption_type_date_idx").on(table.snapshotDate),
    index("consumption_type_category_idx").on(table.categoryType),
    unique("consumption_type_slug_date_unique").on(table.slug, table.snapshotDate),
  ]);

// Public Mode: Terpene Profiles
// Terpene popularity and trend data
export const publicTerpeneProfiles = pgTable("publicTerpeneProfiles", {
  id: serial().primaryKey(),
  terpeneName: varchar({ length: 100 }).notNull(), // 'Limonene', 'Myrcene', 'Beta-Caryophyllene', etc.
  slug: varchar({ length: 100 }).notNull(),
  description: text(),
  iconUrl: varchar({ length: 500 }),
  effects: jsonb(), // Array of associated effects
  aromas: jsonb(), // Array of aroma descriptors
  todayCount: integer().default(0).notNull(),
  yesterdayCount: integer().default(0).notNull(),
  weekOverWeekDelta: integer().default(0).notNull(),
  weekOverWeekPercentage: integer().default(0).notNull(),
  totalStrains: integer().default(0).notNull(), // Number of strains with this terpene
  popularityRank: integer().default(0).notNull(),
  uniqueUsers: integer().default(0).notNull(),
  snapshotDate: date({ mode: 'string' }).notNull(),
  createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
  (table) => [
    index("terpene_profile_date_idx").on(table.snapshotDate),
    index("terpene_profile_rank_idx").on(table.popularityRank),
    unique("terpene_profile_slug_date_unique").on(table.slug, table.snapshotDate),
  ]);

// Public Mode: Leagues
// League config with gameMode: 'public'
export const publicModeLeagues = pgTable("publicModeLeagues", {
  id: serial().primaryKey(),
  name: varchar({ length: 255 }).notNull(),
  slug: varchar({ length: 255 }).notNull(),
  description: text(),
  gameMode: varchar({ length: 50 }).default('public').notNull(), // 'public' or 'b2b'
  ownerId: integer().notNull(), // References users table
  maxTeams: integer().default(10).notNull(),
  draftType: varchar({ length: 50 }).default('snake').notNull(), // 'snake', 'auction', 'auto'
  scoringType: varchar({ length: 50 }).default('weekly').notNull(), // 'weekly', 'daily'
  status: varchar({ length: 50 }).default('draft').notNull(), // 'draft', 'active', 'completed'
  draftStartTime: timestamp({ mode: 'string', withTimezone: true }),
  seasonStartDate: date({ mode: 'string' }),
  seasonEndDate: date({ mode: 'string' }),
  settings: jsonb(), // Additional league settings
  createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
  (table) => [
    index("public_league_owner_idx").on(table.ownerId),
    index("public_league_status_idx").on(table.status),
    unique("public_league_slug_unique").on(table.slug),
  ]);

// Public Mode: Lineups
// 5-position lineup structure
export const publicModeLineups = pgTable("publicModeLineups", {
  id: serial().primaryKey(),
  teamId: integer().notNull(), // References teams table
  leagueId: integer().notNull(), // References publicModeLeagues table
  weekNumber: integer(), // For weekly scoring
  gameDate: date({ mode: 'string' }), // For daily scoring
  // 5 position slots
  legendaryStrainId: integer(), // References publicLegendaryStrains
  trendingStrainId: integer(), // References publicTrendingStrains
  effectCategoryId: integer(), // References publicEffectCategories
  consumptionTypeId: integer(), // References publicConsumptionTypes
  terpeneProfileId: integer(), // References publicTerpeneProfiles
  // Bench slots (optional)
  benchSlots: jsonb(), // Array of bench entities
  totalPoints: integer().default(0).notNull(),
  isLocked: boolean().default(false).notNull(), // Locked after scoring period starts
  createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
  (table) => [
    index("public_lineup_team_idx").on(table.teamId),
    index("public_lineup_league_idx").on(table.leagueId),
    index("public_lineup_week_idx").on(table.weekNumber),
    unique("public_lineup_team_week_unique").on(table.teamId, table.weekNumber),
  ]);

// Public Mode: Stats
// Daily stats for all public entities
export const publicModeStats = pgTable("publicModeStats", {
  id: serial().primaryKey(),
  entityType: varchar({ length: 50 }).notNull(), // 'legendary', 'trending', 'effect', 'consumption', 'terpene'
  entityId: integer().notNull(),
  statDate: date({ mode: 'string' }).notNull(),
  // Base scoring metrics
  ordersCount: integer().default(0).notNull(),
  ordersScore: integer().default(0).notNull(), // 0-40 points
  trendScore: integer().default(0).notNull(), // 0-30 points
  userEngagementScore: integer().default(0).notNull(), // 0-30 points
  // Bonus multipliers
  viralBonus: boolean().default(false).notNull(), // +25%
  communityFavoriteBonus: boolean().default(false).notNull(), // +15%
  coPurchaseBonus: boolean().default(false).notNull(), // +10%
  streakBonus: boolean().default(false).notNull(), // +10%
  // Calculated totals
  basePoints: integer().default(0).notNull(), // Sum of base scores (0-100)
  bonusMultiplier: integer().default(0).notNull(), // Total bonus percentage
  totalPoints: integer().default(0).notNull(), // Final score after bonuses
  // Raw data for calculations
  weekOverWeekGrowth: integer().default(0).notNull(),
  uniqueUsers: integer().default(0).notNull(),
  coPurchaseCount: integer().default(0).notNull(),
  streakDays: integer().default(0).notNull(),
  categoryRank: integer().default(0).notNull(),
  createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
  (table) => [
    index("public_stats_entity_idx").on(table.entityType, table.entityId),
    index("public_stats_date_idx").on(table.statDate),
    unique("public_stats_entity_date_unique").on(table.entityType, table.entityId, table.statDate),
  ]);
