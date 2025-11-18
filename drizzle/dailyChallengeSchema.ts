/**
 * Daily Challenge Stats Schema
 * Optimized for single-day performance tracking with trend-based scoring
 */

import { pgTable, serial, integer, date, timestamp, index, unique, decimal } from 'drizzle-orm/pg-core';
import { manufacturers } from './schema';
import { cannabisStrains } from './schema';
import { strains } from './schema';
import { pharmacies } from './schema';
import { brands } from './schema';

export const manufacturerDailyChallengeStats = pgTable("manufacturerDailyChallengeStats", {
  id: serial().primaryKey(),
  manufacturerId: integer().notNull().references(() => manufacturers.id, { onDelete: 'cascade' }),
  statDate: date({ mode: 'string' }).notNull(),
  salesVolumeGrams: integer().default(0).notNull(),
  orderCount: integer().default(0).notNull(),
  revenueCents: integer().default(0).notNull(),
  totalPoints: integer().default(0).notNull(),
  rank: integer().default(0),
  previousRank: integer().default(0),
  trendMultiplier: decimal({ precision: 10, scale: 2 }).default('0'),
  consistencyScore: integer().default(0),
  velocityScore: integer().default(0),
  streakDays: integer().default(0),
  marketSharePercent: decimal({ precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("manufacturer_daily_challenge_unique").on(table.manufacturerId, table.statDate),
  index("manufacturer_daily_challenge_date_idx").on(table.statDate),
  index("manufacturer_daily_challenge_rank_idx").on(table.statDate, table.rank),
]);

export const strainDailyChallengeStats = pgTable("strainDailyChallengeStats", {
  id: serial().primaryKey(),
  strainId: integer().notNull().references(() => cannabisStrains.id, { onDelete: 'cascade' }),
  statDate: date({ mode: 'string' }).notNull(),
  salesVolumeGrams: integer().default(0).notNull(),
  orderCount: integer().default(0).notNull(),
  totalPoints: integer().default(0).notNull(),
  rank: integer().default(0),
  previousRank: integer().default(0),
  trendMultiplier: decimal({ precision: 10, scale: 2 }).default('0'),
  consistencyScore: integer().default(0),
  velocityScore: integer().default(0),
  streakDays: integer().default(0),
  marketSharePercent: decimal({ precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("strain_daily_challenge_unique").on(table.strainId, table.statDate),
  index("strain_daily_challenge_date_idx").on(table.statDate),
  index("strain_daily_challenge_rank_idx").on(table.statDate, table.rank),
]);

export const productDailyChallengeStats = pgTable("productDailyChallengeStats", {
  id: serial().primaryKey(),
  productId: integer().notNull().references(() => strains.id, { onDelete: 'cascade' }),
  statDate: date({ mode: 'string' }).notNull(),
  salesVolumeGrams: integer().default(0).notNull(),
  orderCount: integer().default(0).notNull(),
  totalPoints: integer().default(0).notNull(),
  rank: integer().default(0),
  previousRank: integer().default(0),
  trendMultiplier: decimal({ precision: 10, scale: 2 }).default('0'),
  consistencyScore: integer().default(0),
  velocityScore: integer().default(0),
  streakDays: integer().default(0),
  marketSharePercent: decimal({ precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("product_daily_challenge_unique").on(table.productId, table.statDate),
  index("product_daily_challenge_date_idx").on(table.statDate),
  index("product_daily_challenge_rank_idx").on(table.statDate, table.rank),
]);

export const pharmacyDailyChallengeStats = pgTable("pharmacyDailyChallengeStats", {
  id: serial().primaryKey(),
  pharmacyId: integer().notNull().references(() => pharmacies.id, { onDelete: 'cascade' }),
  statDate: date({ mode: 'string' }).notNull(),
  orderCount: integer().default(0).notNull(),
  revenueCents: integer().default(0).notNull(),
  totalPoints: integer().default(0).notNull(),
  rank: integer().default(0),
  previousRank: integer().default(0),
  trendMultiplier: decimal({ precision: 10, scale: 2 }).default('0'),
  consistencyScore: integer().default(0),
  velocityScore: integer().default(0),
  streakDays: integer().default(0),
  marketSharePercent: decimal({ precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("pharmacy_daily_challenge_unique").on(table.pharmacyId, table.statDate),
  index("pharmacy_daily_challenge_date_idx").on(table.statDate),
  index("pharmacy_daily_challenge_rank_idx").on(table.statDate, table.rank),
]);

export const brandDailyChallengeStats = pgTable("brandDailyChallengeStats", {
  id: serial().primaryKey(),
  brandId: integer().notNull().references(() => brands.id, { onDelete: 'cascade' }),
  statDate: date({ mode: 'string' }).notNull(),
  totalRatings: integer().default(0).notNull(),
  averageRating: decimal({ precision: 3, scale: 2 }).default('0').notNull(),
  bayesianAverage: decimal({ precision: 3, scale: 2 }).default('0').notNull(),
  veryGoodCount: integer().default(0).notNull(),
  goodCount: integer().default(0).notNull(),
  acceptableCount: integer().default(0).notNull(),
  badCount: integer().default(0).notNull(),
  veryBadCount: integer().default(0).notNull(),
  totalPoints: integer().default(0).notNull(),
  rank: integer().default(0),
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique("brand_daily_challenge_unique").on(table.brandId, table.statDate),
  index("brand_daily_challenge_date_idx").on(table.statDate),
  index("brand_daily_challenge_rank_idx").on(table.statDate, table.rank),
]);
