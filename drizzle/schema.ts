import { pgTable, serial, integer, varchar, text, timestamp, json, index, primaryKey, unique, decimal } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const achievements = pgTable("achievements", {
	id: serial().notNull(),
	userId: integer().notNull(),
	achievementType: varchar({ length: 100 }).notNull(),
	achievementName: varchar({ length: 255 }).notNull(),
	description: text(),
	iconUrl: varchar({ length: 500 }),
	earnedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "achievements_id"}),
]);

export const cannabisStrainWeeklyStats = pgTable("cannabisStrainWeeklyStats", {
	id: serial().notNull(),
	cannabisStrainId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	totalFavorites: integer().default(0).notNull(),
	pharmacyCount: integer().default(0).notNull(),
	productCount: integer().default(0).notNull(),
	avgPriceCents: integer().default(0).notNull(),
	priceChange: integer().default(0).notNull(),
	marketPenetration: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("week_idx").on(table.year, table.week),
	primaryKey({ columns: [table.id], name: "cannabisStrainWeeklyStats_id"}),
	unique("cannabis_strain_week_idx").on(table.cannabisStrainId, table.year, table.week),
]);

export const cannabisStrains = pgTable("cannabisStrains", {
	id: serial().notNull(),
	metabaseId: varchar({ length: 64 }),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }),
	type: varchar({ length: 50 }),
	description: text(),
	effects: json(),
	flavors: json(),
	terpenes: json(),
	thcMin: integer(),
	thcMax: integer(),
	cbdMin: integer(),
	cbdMax: integer(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("name_idx").on(table.name),
	index("slug_idx").on(table.slug),
	primaryKey({ columns: [table.id], name: "cannabisStrains_id"}),
	unique("cannabisStrains_metabaseId_unique").on(table.metabaseId),
	unique("cannabisStrains_slug_unique").on(table.slug),
]);

export const challengeParticipants = pgTable("challengeParticipants", {
	id: serial().notNull(),
	challengeId: integer().notNull(),
	userId: integer().notNull(),
	draftPosition: integer(),
	finalScore: integer().default(0).notNull(),
	finalRank: integer(),
	joinedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "challengeParticipants_id"}),
	unique("challenge_user_idx").on(table.challengeId, table.userId),
]);

export const challengeRosters = pgTable("challengeRosters", {
	id: serial().notNull(),
	challengeId: integer().notNull(),
	userId: integer().notNull(),
	assetType: varchar({ length: 50 }).notNull(),
	assetId: integer().notNull(),
	draftRound: integer().notNull(),
	draftPick: integer().notNull(),
	points: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "challengeRosters_id"}),
	unique("challenge_user_asset_idx").on(table.challengeId, table.userId, table.assetType, table.assetId),
]);

export const challenges = pgTable("challenges", {
	id: serial().notNull(),
	name: varchar({ length: 255 }).notNull(),
	creatorUserId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	maxParticipants: integer().default(8).notNull(),
	draftRounds: integer().default(5).notNull(),
	status: varchar({ length: 50 }).default('open').notNull(),
	draftStartTime: timestamp({ mode: 'string', withTimezone: true }),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "challenges_id"}),
]);

export const draftPicks = pgTable("draftPicks", {
	id: serial().notNull(),
	leagueId: integer().notNull(),
	teamId: integer().notNull(),
	round: integer().notNull(),
	pickNumber: integer().notNull(),
	assetType: varchar(['manufacturer','strain','pharmacy']).notNull(),
	assetId: integer().notNull(),
	pickTime: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "draftPicks_id"}),
	unique("league_pick_idx").on(table.leagueId, table.pickNumber),
]);

export const leagueMessages = pgTable("leagueMessages", {
	id: serial().notNull(),
	leagueId: integer().notNull(),
	userId: integer().notNull(),
	message: text().notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("league_time_idx").on(table.leagueId, table.createdAt),
	primaryKey({ columns: [table.id], name: "leagueMessages_id"}),
]);

export const leagues = pgTable("leagues", {
	id: serial().notNull(),
	name: varchar({ length: 255 }).notNull(),
	commissionerUserId: integer().notNull(),
	teamCount: integer().default(10).notNull(),
	draftType: varchar(['snake','linear']).default('snake').notNull(),
	scoringType: varchar(['standard','custom']).default('standard').notNull(),
	playoffTeams: integer().default(6).notNull(),
	seasonYear: integer().notNull(),
	currentWeek: integer().default(1).notNull(),
	status: varchar(['draft','active','playoffs','completed']).default('draft').notNull(),
	draftDate: timestamp({ mode: 'string', withTimezone: true }),
	seasonStartDate: timestamp({ mode: 'string', withTimezone: true }),
	playoffStartWeek: integer().default(19).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	draftStarted: integer().default(0),
	draftCompleted: integer().default(0),
	currentDraftPick: integer().default(1),
	currentDraftRound: integer().default(1),
	draftPickTimeLimit: integer().default(120),
},
(table) => [
	primaryKey({ columns: [table.id], name: "leagues_id"}),
]);

export const manufacturerWeeklyStats = pgTable("manufacturerWeeklyStats", {
	id: serial().notNull(),
	manufacturerId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	salesVolumeGrams: integer().default(0).notNull(),
	growthRatePercent: integer().default(0).notNull(),
	marketShareRank: integer().notNull(),
	rankChange: integer().default(0).notNull(),
	productCount: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("week_idx").on(table.year, table.week),
	primaryKey({ columns: [table.id], name: "manufacturerWeeklyStats_id"}),
	unique("manufacturer_week_idx").on(table.manufacturerId, table.year, table.week),
]);

export const manufacturers = pgTable("manufacturers", {
	id: serial().notNull(),
	name: varchar({ length: 255 }).notNull(),
	currentRank: integer(),
	weeklyRank: integer(),
	monthlyRank: integer(),
	quarterlyRank: integer(),
	productCount: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("name_idx").on(table.name),
	primaryKey({ columns: [table.id], name: "manufacturers_id"}),
	unique("manufacturers_name_unique").on(table.name),
]);

export const matchups = pgTable("matchups", {
	id: serial().notNull(),
	leagueId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	team1Id: integer().notNull(),
	team2Id: integer().notNull(),
	team1Score: integer().default(0).notNull(),
	team2Score: integer().default(0).notNull(),
	winnerId: integer(),
	status: varchar(['scheduled','in_progress','final']).default('scheduled').notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("league_week_idx").on(table.leagueId, table.year, table.week),
	primaryKey({ columns: [table.id], name: "matchups_id"}),
]);

export const pharmacies = pgTable("pharmacies", {
	id: serial().notNull(),
	name: varchar({ length: 255 }).notNull(),
	city: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	productCount: integer().default(0).notNull(),
	weeklyRevenueCents: integer().default(0).notNull(),
	weeklyOrderCount: integer().default(0).notNull(),
	avgOrderSizeGrams: integer().default(0).notNull(),
	customerRetentionRate: integer().default(0).notNull(),
	appUsageRate: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("name_idx").on(table.name),
	primaryKey({ columns: [table.id], name: "pharmacies_id"}),
	unique("pharmacies_name_unique").on(table.name),
]);

export const pharmacyWeeklyStats = pgTable("pharmacyWeeklyStats", {
	id: serial().notNull(),
	pharmacyId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	revenueCents: integer().default(0).notNull(),
	orderCount: integer().default(0).notNull(),
	avgOrderSizeGrams: integer().default(0).notNull(),
	customerRetentionRate: integer().default(0).notNull(),
	productVariety: integer().default(0).notNull(),
	appUsageRate: integer().default(0).notNull(),
	growthRatePercent: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("week_idx").on(table.year, table.week),
	primaryKey({ columns: [table.id], name: "pharmacyWeeklyStats_id"}),
	unique("pharmacy_week_idx").on(table.pharmacyId, table.year, table.week),
]);

export const rosters = pgTable("rosters", {
	id: serial().notNull(),
	teamId: integer().notNull(),
	assetType: varchar({ length: 50 }).notNull(),
	assetId: integer().notNull(),
	acquiredWeek: integer().notNull(),
	acquiredVia: varchar(['draft','waiver','trade','free_agent']).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "rosters_id"}),
	unique("team_asset_idx").on(table.teamId, table.assetType, table.assetId),
]);

export const scoringBreakdowns = pgTable("scoringBreakdowns", {
	id: serial().notNull(),
	weeklyTeamScoreId: integer().notNull(),
	assetType: varchar(['manufacturer','strain','pharmacy']).notNull(),
	assetId: integer().notNull(),
	position: varchar({ length: 20 }).notNull(),
	breakdown: json().notNull(),
	totalPoints: integer().notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "scoringBreakdowns_id"}),
]);

export const strainWeeklyStats = pgTable("strainWeeklyStats", {
	id: serial().notNull(),
	strainId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	favoriteCount: integer().default(0).notNull(),
	favoriteGrowth: integer().default(0).notNull(),
	pharmacyCount: integer().default(0).notNull(),
	pharmacyExpansion: integer().default(0).notNull(),
	avgPriceCents: integer().notNull(),
	priceStability: integer().default(0).notNull(),
	orderVolumeGrams: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("week_idx").on(table.year, table.week),
	primaryKey({ columns: [table.id], name: "strainWeeklyStats_id"}),
	unique("strain_week_idx").on(table.strainId, table.year, table.week),
]);

export const strains = pgTable("strains", {
	id: serial().notNull(),
	metabaseId: varchar({ length: 64 }),
	name: varchar({ length: 255 }).notNull(),
	strainId: integer(),
	strainName: varchar({ length: 255 }),
	manufacturerId: integer(),
	manufacturerName: varchar({ length: 255 }),
	favoriteCount: integer().default(0).notNull(),
	pharmacyCount: integer().default(0).notNull(),
	avgPriceCents: integer().notNull(),
	minPriceCents: integer().notNull(),
	maxPriceCents: integer().notNull(),
	priceCategory: varchar(['excellent','below_average','average','above_average','expensive']).default('average'),
	thcContent: varchar({ length: 50 }),
	cbdContent: varchar({ length: 50 }),
	genetics: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("name_idx").on(table.name),
	index("manufacturer_idx").on(table.manufacturerId),
	primaryKey({ columns: [table.id], name: "strains_id"}),
	unique("strains_metabaseId_unique").on(table.metabaseId),
]);

export const teams = pgTable("teams", {
	id: serial().notNull(),
	leagueId: integer().notNull(),
	userId: integer().notNull(),
	name: varchar({ length: 255 }).notNull(),
	draftPosition: integer(),
	waiverPriority: integer().default(1).notNull(),
	faabBudget: integer().default(100).notNull(),
	wins: integer().default(0).notNull(),
	losses: integer().default(0).notNull(),
	ties: integer().default(0).notNull(),
	pointsFor: integer().default(0).notNull(),
	pointsAgainst: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "teams_id"}),
	unique("league_user_idx").on(table.leagueId, table.userId),
]);

export const trades = pgTable("trades", {
	id: serial().notNull(),
	leagueId: integer().notNull(),
	team1Id: integer().notNull(),
	team2Id: integer().notNull(),
	team1Assets: json().notNull(),
	team2Assets: json().notNull(),
	status: varchar(['proposed','accepted','rejected','cancelled']).default('proposed').notNull(),
	proposedBy: integer().notNull(),
	processedWeek: integer(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "trades_id"}),
]);

export const users = pgTable("users", {
	id: serial().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: varchar(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "users_id"}),
	unique("users_openId_unique").on(table.openId),
]);

export const waiverClaims = pgTable("waiverClaims", {
	id: serial().notNull(),
	leagueId: integer().notNull(),
	teamId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	addAssetType: varchar({ length: 50 }).notNull(),
	addAssetId: integer().notNull(),
	dropAssetType: varchar({ length: 50 }).notNull(),
	dropAssetId: integer().notNull(),
	bidAmount: integer().notNull(),
	priority: integer().notNull(),
	status: varchar(['pending','successful','failed']).default('pending').notNull(),
	processedAt: timestamp({ mode: 'string', withTimezone: true }),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "waiverClaims_id"}),
]);

export const weeklyLineups = pgTable("weeklyLineups", {
	id: serial().notNull(),
	teamId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	mfg1Id: integer(),
	mfg2Id: integer(),
	cstr1Id: integer(),
	cstr2Id: integer(),
	prd1Id: integer(),
	prd2Id: integer(),
	phm1Id: integer(),
	phm2Id: integer(),
	flexId: integer(),
	flexType: varchar({ length: 50 }),
	isLocked: integer().default(0).notNull(),
	lockedAt: timestamp({ mode: 'string', withTimezone: true }),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "weeklyLineups_id"}),
	unique("team_week_idx").on(table.teamId, table.year, table.week),
]);

export const weeklyTeamScores = pgTable("weeklyTeamScores", {
	id: serial().notNull(),
	teamId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	mfg1Points: integer().default(0).notNull(),
	mfg2Points: integer().default(0).notNull(),
	cstr1Points: integer().default(0).notNull(),
	cstr2Points: integer().default(0).notNull(),
	prd1Points: integer().default(0).notNull(),
	prd2Points: integer().default(0).notNull(),
	phm1Points: integer().default(0).notNull(),
	phm2Points: integer().default(0).notNull(),
	flexPoints: integer().default(0).notNull(),
	bonusPoints: integer().default(0).notNull(),
	penaltyPoints: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "weeklyTeamScores_id"}),
	unique("team_week_idx").on(table.teamId, table.year, table.week),
]);
