/**
 * Cannabis Stock Market Schema
 * 
 * Products = Individual Stocks
 * Strains = Mutual Funds
 * Manufacturers = Hedge Funds
 */

import { pgTable, serial, integer, varchar, decimal, timestamp, date, index, unique, boolean } from "drizzle-orm/pg-core";

// User Portfolios - tracks cash balance and total value
export const userPortfolios = pgTable("userPortfolios", {
    id: serial().primaryKey(),
    userId: integer().notNull(),
    cashBalance: decimal({ precision: 12, scale: 2 }).default('100000').notNull(), // Starting €100k
    totalValue: decimal({ precision: 12, scale: 2 }).default('100000').notNull(),
    totalProfitLoss: decimal({ precision: 12, scale: 2 }).default('0').notNull(),
    winCount: integer().default(0).notNull(),
    lossCount: integer().default(0).notNull(),
    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    unique("user_portfolio_unique").on(table.userId),
]);

// Stock Holdings - what users own
export const stockHoldings = pgTable("stockHoldings", {
    id: serial().primaryKey(),
    userId: integer().notNull(),
    assetType: varchar({ length: 20 }).notNull(), // 'product', 'strain', 'manufacturer'
    assetId: integer().notNull(),
    shares: decimal({ precision: 10, scale: 4 }).notNull(),
    avgBuyPrice: decimal({ precision: 10, scale: 2 }).notNull(),
    isShort: boolean().default(false).notNull(), // True if short position
    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("holdings_user_idx").on(table.userId),
    index("holdings_asset_idx").on(table.assetType, table.assetId),
    unique("holdings_unique").on(table.userId, table.assetType, table.assetId, table.isShort),
]);

// Trade History - all buy/sell transactions
export const tradeHistory = pgTable("tradeHistory", {
    id: serial().primaryKey(),
    userId: integer().notNull(),
    assetType: varchar({ length: 20 }).notNull(),
    assetId: integer().notNull(),
    assetName: varchar({ length: 255 }), // Cached for display
    action: varchar({ length: 10 }).notNull(), // 'buy', 'sell', 'short', 'cover'
    shares: decimal({ precision: 10, scale: 4 }).notNull(),
    pricePerShare: decimal({ precision: 10, scale: 2 }).notNull(),
    totalValue: decimal({ precision: 12, scale: 2 }).notNull(),
    profitLoss: decimal({ precision: 12, scale: 2 }), // Realized P/L on sell
    executedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("trade_user_idx").on(table.userId),
    index("trade_date_idx").on(table.executedAt),
]);

// Daily Stock Prices - historical prices for charts
export const stockPrices = pgTable("stockPrices", {
    id: serial().primaryKey(),
    assetType: varchar({ length: 20 }).notNull(),
    assetId: integer().notNull(),
    priceDate: date({ mode: 'string' }).notNull(),
    openPrice: decimal({ precision: 10, scale: 2 }).notNull(),
    closePrice: decimal({ precision: 10, scale: 2 }).notNull(),
    highPrice: decimal({ precision: 10, scale: 2 }).notNull(),
    lowPrice: decimal({ precision: 10, scale: 2 }).notNull(),
    volume: integer().default(0).notNull(), // Order count
    priceChange: decimal({ precision: 10, scale: 2 }).default('0').notNull(),
    priceChangePercent: decimal({ precision: 5, scale: 2 }).default('0').notNull(),
    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("stock_price_date_idx").on(table.priceDate),
    index("stock_price_asset_idx").on(table.assetType, table.assetId),
    unique("stock_price_unique").on(table.assetType, table.assetId, table.priceDate),
]);

// Market Leaderboard - daily/weekly/alltime rankings
export const marketLeaderboard = pgTable("marketLeaderboard", {
    id: serial().primaryKey(),
    userId: integer().notNull(),
    period: varchar({ length: 20 }).notNull(), // 'daily', 'weekly', 'alltime'
    periodDate: date({ mode: 'string' }).notNull(),
    portfolioValue: decimal({ precision: 12, scale: 2 }).notNull(),
    profitLoss: decimal({ precision: 12, scale: 2 }).notNull(),
    profitLossPercent: decimal({ precision: 5, scale: 2 }).notNull(),
    rank: integer(),
    createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("leaderboard_period_idx").on(table.period, table.periodDate),
    unique("leaderboard_unique").on(table.userId, table.period, table.periodDate),
]);

// User Achievements
export const marketAchievements = pgTable("marketAchievements", {
    id: serial().primaryKey(),
    userId: integer().notNull(),
    achievementType: varchar({ length: 50 }).notNull(),
    achievementName: varchar({ length: 100 }).notNull(),
    description: varchar({ length: 255 }),
    earnedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
}, (table) => [
    index("achievement_user_idx").on(table.userId),
    unique("achievement_unique").on(table.userId, table.achievementType),
]);
