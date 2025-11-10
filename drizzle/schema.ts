import { mysqlTable, mysqlSchema, AnyMySqlColumn, primaryKey, int, varchar, text, timestamp, index, unique, mysqlEnum, json, tinyint, decimal } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const achievements = mysqlTable("achievements", {
	id: int().autoincrement().notNull(),
	userId: int().notNull(),
	achievementType: varchar({ length: 100 }).notNull(),
	achievementName: varchar({ length: 255 }).notNull(),
	description: text(),
	iconUrl: varchar({ length: 500 }),
	earnedAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "achievements_id"}),
]);

export const cannabisStrainWeeklyStats = mysqlTable("cannabisStrainWeeklyStats", {
	id: int().autoincrement().notNull(),
	cannabisStrainId: int().notNull(),
	year: int().notNull(),
	week: int().notNull(),
	totalFavorites: int().default(0).notNull(),
	pharmacyCount: int().default(0).notNull(),
	productCount: int().default(0).notNull(),
	avgPriceCents: int().default(0).notNull(),
	priceChange: int().default(0).notNull(),
	marketPenetration: int().default(0).notNull(),
	totalPoints: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	index("week_idx").on(table.year, table.week),
	primaryKey({ columns: [table.id], name: "cannabisStrainWeeklyStats_id"}),
	unique("cannabis_strain_week_idx").on(table.cannabisStrainId, table.year, table.week),
]);

export const cannabisStrains = mysqlTable("cannabisStrains", {
	id: int().autoincrement().notNull(),
	metabaseId: varchar({ length: 64 }),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }),
	type: mysqlEnum(['sativa','indica','hybrid']),
	description: text(),
	effects: json(),
	flavors: json(),
	terpenes: json(),
	thcMin: int(),
	thcMax: int(),
	cbdMin: int(),
	cbdMax: int(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	index("name_idx").on(table.name),
	index("slug_idx").on(table.slug),
	primaryKey({ columns: [table.id], name: "cannabisStrains_id"}),
	unique("cannabisStrains_metabaseId_unique").on(table.metabaseId),
	unique("cannabisStrains_slug_unique").on(table.slug),
]);

export const challengeParticipants = mysqlTable("challengeParticipants", {
	id: int().autoincrement().notNull(),
	challengeId: int().notNull(),
	userId: int().notNull(),
	draftPosition: int(),
	finalScore: int().default(0).notNull(),
	finalRank: int(),
	joinedAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "challengeParticipants_id"}),
	unique("challenge_user_idx").on(table.challengeId, table.userId),
]);

export const challengeRosters = mysqlTable("challengeRosters", {
	id: int().autoincrement().notNull(),
	challengeId: int().notNull(),
	userId: int().notNull(),
	assetType: mysqlEnum(['manufacturer','cannabis_strain','product','pharmacy']).notNull(),
	assetId: int().notNull(),
	draftRound: int().notNull(),
	draftPick: int().notNull(),
	points: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "challengeRosters_id"}),
	unique("challenge_user_asset_idx").on(table.challengeId, table.userId, table.assetType, table.assetId),
]);

export const challenges = mysqlTable("challenges", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	creatorUserId: int().notNull(),
	year: int().notNull(),
	week: int().notNull(),
	maxParticipants: int().default(8).notNull(),
	draftRounds: int().default(5).notNull(),
	status: mysqlEnum(['open','drafting','active','completed']).default('open').notNull(),
	draftStartTime: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "challenges_id"}),
]);

export const draftPicks = mysqlTable("draftPicks", {
	id: int().autoincrement().notNull(),
	leagueId: int().notNull(),
	teamId: int().notNull(),
	round: int().notNull(),
	pickNumber: int().notNull(),
	assetType: mysqlEnum(['manufacturer','strain','pharmacy']).notNull(),
	assetId: int().notNull(),
	pickTime: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "draftPicks_id"}),
	unique("league_pick_idx").on(table.leagueId, table.pickNumber),
]);

export const leagueMessages = mysqlTable("leagueMessages", {
	id: int().autoincrement().notNull(),
	leagueId: int().notNull(),
	userId: int().notNull(),
	message: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	index("league_time_idx").on(table.leagueId, table.createdAt),
	primaryKey({ columns: [table.id], name: "leagueMessages_id"}),
]);

export const leagues = mysqlTable("leagues", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	commissionerUserId: int().notNull(),
	teamCount: int().default(10).notNull(),
	draftType: mysqlEnum(['snake','linear']).default('snake').notNull(),
	scoringType: mysqlEnum(['standard','custom']).default('standard').notNull(),
	playoffTeams: int().default(6).notNull(),
	seasonYear: int().notNull(),
	currentWeek: int().default(1).notNull(),
	status: mysqlEnum(['draft','active','playoffs','completed']).default('draft').notNull(),
	draftDate: timestamp({ mode: 'string' }),
	seasonStartDate: timestamp({ mode: 'string' }),
	playoffStartWeek: int().default(19).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
	draftStarted: tinyint().default(0),
	draftCompleted: tinyint().default(0),
	currentDraftPick: int().default(1),
	currentDraftRound: int().default(1),
	draftPickTimeLimit: int().default(120),
},
(table) => [
	primaryKey({ columns: [table.id], name: "leagues_id"}),
]);

export const manufacturerWeeklyStats = mysqlTable("manufacturerWeeklyStats", {
	id: int().autoincrement().notNull(),
	manufacturerId: int().notNull(),
	year: int().notNull(),
	week: int().notNull(),
	salesVolumeGrams: int().default(0).notNull(),
	growthRatePercent: int().default(0).notNull(),
	marketShareRank: int().notNull(),
	rankChange: int().default(0).notNull(),
	productCount: int().default(0).notNull(),
	totalPoints: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	index("week_idx").on(table.year, table.week),
	primaryKey({ columns: [table.id], name: "manufacturerWeeklyStats_id"}),
	unique("manufacturer_week_idx").on(table.manufacturerId, table.year, table.week),
]);

export const manufacturers = mysqlTable("manufacturers", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	currentRank: int(),
	weeklyRank: int(),
	monthlyRank: int(),
	quarterlyRank: int(),
	productCount: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	index("name_idx").on(table.name),
	primaryKey({ columns: [table.id], name: "manufacturers_id"}),
	unique("manufacturers_name_unique").on(table.name),
]);

export const matchups = mysqlTable("matchups", {
	id: int().autoincrement().notNull(),
	leagueId: int().notNull(),
	year: int().notNull(),
	week: int().notNull(),
	team1Id: int().notNull(),
	team2Id: int().notNull(),
	team1Score: int().default(0).notNull(),
	team2Score: int().default(0).notNull(),
	winnerId: int(),
	status: mysqlEnum(['scheduled','in_progress','final']).default('scheduled').notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	index("league_week_idx").on(table.leagueId, table.year, table.week),
	primaryKey({ columns: [table.id], name: "matchups_id"}),
]);

export const pharmacies = mysqlTable("pharmacies", {
	id: int().autoincrement().notNull(),
	name: varchar({ length: 255 }).notNull(),
	city: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	productCount: int().default(0).notNull(),
	weeklyRevenueCents: int().default(0).notNull(),
	weeklyOrderCount: int().default(0).notNull(),
	avgOrderSizeGrams: int().default(0).notNull(),
	customerRetentionRate: int().default(0).notNull(),
	appUsageRate: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	index("name_idx").on(table.name),
	primaryKey({ columns: [table.id], name: "pharmacies_id"}),
	unique("pharmacies_name_unique").on(table.name),
]);

export const pharmacyWeeklyStats = mysqlTable("pharmacyWeeklyStats", {
	id: int().autoincrement().notNull(),
	pharmacyId: int().notNull(),
	year: int().notNull(),
	week: int().notNull(),
	revenueCents: int().default(0).notNull(),
	orderCount: int().default(0).notNull(),
	avgOrderSizeGrams: int().default(0).notNull(),
	customerRetentionRate: int().default(0).notNull(),
	productVariety: int().default(0).notNull(),
	appUsageRate: int().default(0).notNull(),
	growthRatePercent: int().default(0).notNull(),
	totalPoints: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	index("week_idx").on(table.year, table.week),
	primaryKey({ columns: [table.id], name: "pharmacyWeeklyStats_id"}),
	unique("pharmacy_week_idx").on(table.pharmacyId, table.year, table.week),
]);

export const rosters = mysqlTable("rosters", {
	id: int().autoincrement().notNull(),
	teamId: int().notNull(),
	assetType: mysqlEnum(['manufacturer','cannabis_strain','product','pharmacy']).notNull(),
	assetId: int().notNull(),
	acquiredWeek: int().notNull(),
	acquiredVia: mysqlEnum(['draft','waiver','trade','free_agent']).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "rosters_id"}),
	unique("team_asset_idx").on(table.teamId, table.assetType, table.assetId),
]);

export const scoringBreakdowns = mysqlTable("scoringBreakdowns", {
	id: int().autoincrement().notNull(),
	weeklyTeamScoreId: int().notNull(),
	assetType: mysqlEnum(['manufacturer','strain','pharmacy']).notNull(),
	assetId: int().notNull(),
	position: varchar({ length: 20 }).notNull(),
	breakdown: json().notNull(),
	totalPoints: int().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "scoringBreakdowns_id"}),
]);

export const strainWeeklyStats = mysqlTable("strainWeeklyStats", {
	id: int().autoincrement().notNull(),
	strainId: int().notNull(),
	year: int().notNull(),
	week: int().notNull(),
	favoriteCount: int().default(0).notNull(),
	favoriteGrowth: int().default(0).notNull(),
	pharmacyCount: int().default(0).notNull(),
	pharmacyExpansion: int().default(0).notNull(),
	avgPriceCents: int().notNull(),
	priceStability: int().default(0).notNull(),
	orderVolumeGrams: int().default(0).notNull(),
	totalPoints: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	index("week_idx").on(table.year, table.week),
	primaryKey({ columns: [table.id], name: "strainWeeklyStats_id"}),
	unique("strain_week_idx").on(table.strainId, table.year, table.week),
]);

export const strains = mysqlTable("strains", {
	id: int().autoincrement().notNull(),
	metabaseId: varchar({ length: 64 }),
	name: varchar({ length: 255 }).notNull(),
	strainId: int(),
	strainName: varchar({ length: 255 }),
	manufacturerId: int(),
	manufacturerName: varchar({ length: 255 }),
	favoriteCount: int().default(0).notNull(),
	pharmacyCount: int().default(0).notNull(),
	avgPriceCents: int().notNull(),
	minPriceCents: int().notNull(),
	maxPriceCents: int().notNull(),
	priceCategory: mysqlEnum(['excellent','below_average','average','above_average','expensive']).default('average'),
	thcContent: varchar({ length: 50 }),
	cbdContent: varchar({ length: 50 }),
	genetics: mysqlEnum(['sativa','indica','hybrid']),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	index("name_idx").on(table.name),
	index("manufacturer_idx").on(table.manufacturerId),
	primaryKey({ columns: [table.id], name: "strains_id"}),
	unique("strains_metabaseId_unique").on(table.metabaseId),
]);

export const teams = mysqlTable("teams", {
	id: int().autoincrement().notNull(),
	leagueId: int().notNull(),
	userId: int().notNull(),
	name: varchar({ length: 255 }).notNull(),
	draftPosition: int(),
	waiverPriority: int().default(1).notNull(),
	faabBudget: int().default(100).notNull(),
	wins: int().default(0).notNull(),
	losses: int().default(0).notNull(),
	ties: int().default(0).notNull(),
	pointsFor: int().default(0).notNull(),
	pointsAgainst: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "teams_id"}),
	unique("league_user_idx").on(table.leagueId, table.userId),
]);

export const trades = mysqlTable("trades", {
	id: int().autoincrement().notNull(),
	leagueId: int().notNull(),
	team1Id: int().notNull(),
	team2Id: int().notNull(),
	team1Assets: json().notNull(),
	team2Assets: json().notNull(),
	status: mysqlEnum(['proposed','accepted','rejected','cancelled']).default('proposed').notNull(),
	proposedBy: int().notNull(),
	processedWeek: int(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "trades_id"}),
]);

export const users = mysqlTable("users", {
	id: int().autoincrement().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "users_id"}),
	unique("users_openId_unique").on(table.openId),
]);

export const waiverClaims = mysqlTable("waiverClaims", {
	id: int().autoincrement().notNull(),
	leagueId: int().notNull(),
	teamId: int().notNull(),
	year: int().notNull(),
	week: int().notNull(),
	addAssetType: mysqlEnum(['manufacturer','cannabis_strain','product','pharmacy']).notNull(),
	addAssetId: int().notNull(),
	dropAssetType: mysqlEnum(['manufacturer','cannabis_strain','product','pharmacy']).notNull(),
	dropAssetId: int().notNull(),
	bidAmount: int().notNull(),
	priority: int().notNull(),
	status: mysqlEnum(['pending','successful','failed']).default('pending').notNull(),
	processedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "waiverClaims_id"}),
]);

export const weeklyLineups = mysqlTable("weeklyLineups", {
	id: int().autoincrement().notNull(),
	teamId: int().notNull(),
	year: int().notNull(),
	week: int().notNull(),
	mfg1Id: int(),
	mfg2Id: int(),
	cstr1Id: int(),
	cstr2Id: int(),
	prd1Id: int(),
	prd2Id: int(),
	phm1Id: int(),
	phm2Id: int(),
	flexId: int(),
	flexType: mysqlEnum(['manufacturer','cannabis_strain','product','pharmacy']),
	isLocked: tinyint().default(0).notNull(),
	lockedAt: timestamp({ mode: 'string' }),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`(now())`).onUpdateNow().notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "weeklyLineups_id"}),
	unique("team_week_idx").on(table.teamId, table.year, table.week),
]);

export const weeklyTeamScores = mysqlTable("weeklyTeamScores", {
	id: int().autoincrement().notNull(),
	teamId: int().notNull(),
	year: int().notNull(),
	week: int().notNull(),
	mfg1Points: int().default(0).notNull(),
	mfg2Points: int().default(0).notNull(),
	cstr1Points: int().default(0).notNull(),
	cstr2Points: int().default(0).notNull(),
	prd1Points: int().default(0).notNull(),
	prd2Points: int().default(0).notNull(),
	phm1Points: int().default(0).notNull(),
	phm2Points: int().default(0).notNull(),
	flexPoints: int().default(0).notNull(),
	bonusPoints: int().default(0).notNull(),
	penaltyPoints: int().default(0).notNull(),
	totalPoints: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now())`).notNull(),
},
(table) => [
	primaryKey({ columns: [table.id], name: "weeklyTeamScores_id"}),
	unique("team_week_idx").on(table.teamId, table.year, table.week),
]);
