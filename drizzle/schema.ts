import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Strains table - represents tradable cannabis strain stocks
export const strains = mysqlTable("strains", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  // Stock price components
  basePrice: int("basePrice").notNull(), // Base price from average market price
  popularityBonus: int("popularityBonus").default(0).notNull(), // Bonus from favorite counts
  volatilityPremium: int("volatilityPremium").default(0).notNull(), // Premium from price volatility
  currentPrice: int("currentPrice").notNull(), // Total calculated price
  // Market data
  favoriteCount: int("favoriteCount").default(0).notNull(),
  pharmacyCount: int("pharmacyCount").default(0).notNull(),
  avgMarketPrice: int("avgMarketPrice").notNull(), // in cents
  priceMin30d: int("priceMin30d").notNull(), // 30-day min price in cents
  priceMax30d: int("priceMax30d").notNull(), // 30-day max price in cents
  volatilityRating: mysqlEnum("volatilityRating", ["low", "medium", "high"]).default("medium").notNull(),
  priceCategory: mysqlEnum("priceCategory", ["excellent", "below_average", "average", "above_average", "expensive"]).default("average").notNull(),
  genetics: mysqlEnum("genetics", ["sativa", "indica", "hybrid"]).default("hybrid"),
  thcContent: varchar("thcContent", { length: 50 }),
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Strain = typeof strains.$inferSelect;
export type InsertStrain = typeof strains.$inferInsert;

// User wallets - tracks WeedCoins balance
export const wallets = mysqlTable("wallets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  balance: int("balance").default(1000).notNull(), // Starting balance: 1000 WeedCoins
  totalProfit: int("totalProfit").default(0).notNull(),
  totalTrades: int("totalTrades").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;

// Portfolio holdings - tracks user's strain stock ownership
export const holdings = mysqlTable("holdings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strainId: int("strainId").notNull(),
  quantity: int("quantity").notNull(),
  avgBuyPrice: int("avgBuyPrice").notNull(), // Average price paid per share
  totalInvested: int("totalInvested").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Holding = typeof holdings.$inferSelect;
export type InsertHolding = typeof holdings.$inferInsert;

// Trade history
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strainId: int("strainId").notNull(),
  type: mysqlEnum("type", ["buy", "sell"]).notNull(),
  quantity: int("quantity").notNull(),
  pricePerShare: int("pricePerShare").notNull(),
  totalAmount: int("totalAmount").notNull(),
  profitLoss: int("profitLoss").default(0).notNull(), // For sell trades
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;

// Bets - futures, head-to-head, prop bets
export const bets = mysqlTable("bets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["future", "head_to_head", "prop"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  stake: int("stake").notNull(),
  odds: int("odds").notNull(), // Stored as integer (e.g., 250 = 2.5x)
  potentialPayout: int("potentialPayout").notNull(),
  status: mysqlEnum("status", ["active", "won", "lost", "cancelled"]).default("active").notNull(),
  prediction: text("prediction").notNull(), // JSON string with bet details
  result: text("result"), // JSON string with outcome
  settledAt: timestamp("settledAt"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Bet = typeof bets.$inferSelect;
export type InsertBet = typeof bets.$inferInsert;

// Achievements
export const achievements = mysqlTable("achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  badgeType: varchar("badgeType", { length: 100 }).notNull(),
  badgeName: varchar("badgeName", { length: 255 }).notNull(),
  description: text("description"),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
});

export type Achievement = typeof achievements.$inferSelect;
export type InsertAchievement = typeof achievements.$inferInsert;

// User favorites - tracks which strains users have favorited
export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strainId: int("strainId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

// Market events - news feed
export const marketEvents = mysqlTable("marketEvents", {
  id: int("id").autoincrement().primaryKey(),
  strainId: int("strainId"),
  eventType: mysqlEnum("eventType", ["price_drop", "popularity_surge", "new_pharmacy", "stock_out", "volatility_spike"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  impact: varchar("impact", { length: 100 }), // e.g., "+2%", "+5%"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MarketEvent = typeof marketEvents.$inferSelect;
export type InsertMarketEvent = typeof marketEvents.$inferInsert;