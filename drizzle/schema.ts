import { pgTable, serial, integer, varchar, text, timestamp, json, index, primaryKey, unique, decimal, date } from "drizzle-orm/pg-core"
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
]);

export const brands = pgTable("brands", {
	id: serial().notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }),
	description: text(),
	logoUrl: varchar({ length: 500 }),
	websiteUrl: varchar({ length: 500 }),
	totalFavorites: integer().default(0).notNull(),
	totalViews: integer().default(0).notNull(),
	totalComments: integer().default(0).notNull(),
	affiliateClicks: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("brands_name_idx").on(table.name),
	unique("brands_name_unique").on(table.name),
]);

export const brandWeeklyStats = pgTable("brandWeeklyStats", {
	id: serial().notNull(),
	brandId: integer().notNull(),
	year: integer().notNull(),
	week: integer().notNull(),
	favorites: integer().default(0).notNull(),
	favoriteGrowth: integer().default(0).notNull(),
	views: integer().default(0).notNull(),
	viewGrowth: integer().default(0).notNull(),
	comments: integer().default(0).notNull(),
	commentGrowth: integer().default(0).notNull(),
	affiliateClicks: integer().default(0).notNull(),
	clickGrowth: integer().default(0).notNull(),
	engagementRate: integer().default(0).notNull(),
	sentimentScore: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("brand_week_idx").on(table.year, table.week),
	unique("brand_week_unique").on(table.brandId, table.year, table.week),
]);

export const brandDailyStats = pgTable("brandDailyStats", {
	id: serial().notNull(),
	brandId: integer().notNull(),
	statDate: date({ mode: 'string' }).notNull(),
	favorites: integer().default(0).notNull(),
	favoriteGrowth: integer().default(0).notNull(),
	views: integer().default(0).notNull(),
	viewGrowth: integer().default(0).notNull(),
	comments: integer().default(0).notNull(),
	commentGrowth: integer().default(0).notNull(),
	affiliateClicks: integer().default(0).notNull(),
	clickGrowth: integer().default(0).notNull(),
	engagementRate: integer().default(0).notNull(),
	sentimentScore: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("brand_daily_date_idx").on(table.statDate),
	unique("brand_daily_unique").on(table.brandId, table.statDate),
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
	index("cannabis_strain_week_idx").on(table.year, table.week),
	unique("cannabis_strain_week_unique").on(table.cannabisStrainId, table.year, table.week),
]);

export const cannabisStrainDailyStats = pgTable("cannabisStrainDailyStats", {
	id: serial().notNull(),
	cannabisStrainId: integer().notNull(),
	statDate: date({ mode: 'string' }).notNull(),
	totalFavorites: integer().default(0).notNull(),
	pharmacyCount: integer().default(0).notNull(),
	productCount: integer().default(0).notNull(),
	avgPriceCents: integer().default(0).notNull(),
	priceChange: integer().default(0).notNull(),
	marketPenetration: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("cannabis_strain_daily_date_idx").on(table.statDate),
	unique("cannabis_strain_daily_unique").on(table.cannabisStrainId, table.statDate),
]);

export const cannabisStrains = pgTable("cannabisStrains", {
	id: serial().notNull(),
	metabaseId: varchar({ length: 64 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	slug: varchar({ length: 255 }),
	type: varchar({ length: 50 }),
	description: text(),
	effects: text(),
	flavors: text(),
	terpenes: text(),
	thcMin: integer(),
	thcMax: integer(),
	cbdMin: integer(),
	cbdMax: integer(),
	pharmaceuticalProductCount: integer().default(0),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("cannabis_strains_name_idx").on(table.name),
	index("cannabis_strains_slug_idx").on(table.slug),
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
]);

export const draftPicks = pgTable("draftPicks", {
	id: serial().notNull(),
	leagueId: integer().notNull(),
	teamId: integer().notNull(),
	round: integer().notNull(),
	pickNumber: integer().notNull(),
	assetType: varchar({ length: 50 }).notNull(),
	assetId: integer().notNull(),
	pickTime: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
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
]);

export const leagues = pgTable("leagues", {
	id: serial().notNull(),
	name: varchar({ length: 255 }).notNull(),
	leagueCode: varchar({ length: 10 }),
	commissionerUserId: integer().notNull(),
	teamCount: integer().default(10).notNull(),
	draftType: varchar({ length: 50 }).default('snake').notNull(),
	scoringType: varchar({ length: 50 }).default('standard').notNull(),
	playoffTeams: integer().default(6).notNull(),
	seasonYear: integer().notNull(),
	currentWeek: integer().default(1).notNull(),
	status: varchar({ length: 50 }).default('draft').notNull(),
	leagueType: varchar({ length: 50 }).default('season').notNull(),
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
	unique("leagues_leagueCode_unique").on(table.leagueCode),
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
	index("manufacturer_week_idx").on(table.year, table.week),
	unique("manufacturer_week_unique").on(table.manufacturerId, table.year, table.week),
]);

export const manufacturerDailyStats = pgTable("manufacturerDailyStats", {
	id: serial().notNull(),
	manufacturerId: integer().notNull(),
	statDate: date({ mode: 'string' }).notNull(),
	salesVolumeGrams: integer().default(0).notNull(),
	growthRatePercent: integer().default(0).notNull(),
	marketShareRank: integer().default(0).notNull(),
	rankChange: integer().default(0).notNull(),
	productCount: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("manufacturer_daily_date_idx").on(table.statDate),
	unique("manufacturer_daily_unique").on(table.manufacturerId, table.statDate),
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
	index("manufacturers_name_idx").on(table.name),
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
	status: varchar({ length: 50 }).default('scheduled').notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("league_week_idx").on(table.leagueId, table.year, table.week),
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
	index("pharmacies_name_idx").on(table.name),
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
	index("pharmacy_week_idx").on(table.year, table.week),
	unique("pharmacy_week_unique").on(table.pharmacyId, table.year, table.week),
]);

export const pharmacyDailyStats = pgTable("pharmacyDailyStats", {
	id: serial().notNull(),
	pharmacyId: integer().notNull(),
	statDate: date({ mode: 'string' }).notNull(),
	revenueCents: integer().default(0).notNull(),
	orderCount: integer().default(0).notNull(),
	avgOrderSizeGrams: integer().default(0).notNull(),
	customerRetentionRate: integer().default(0).notNull(),
	productVariety: integer().default(0).notNull(),
	appUsageRate: integer().default(0).notNull(),
	growthRatePercent: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("pharmacy_daily_date_idx").on(table.statDate),
	unique("pharmacy_daily_unique").on(table.pharmacyId, table.statDate),
]);

export const rosters = pgTable("rosters", {
	id: serial().notNull(),
	teamId: integer().notNull(),
	assetType: varchar({ length: 50 }).notNull(),
	assetId: integer().notNull(),
	acquiredWeek: integer().notNull(),
	acquiredVia: varchar({ length: 50 }).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	unique("team_asset_idx").on(table.teamId, table.assetType, table.assetId),
]);

export const scoringBreakdowns = pgTable("scoringBreakdowns", {
	id: serial().notNull(),
	weeklyTeamScoreId: integer().notNull(),
	assetType: varchar({ length: 50 }).notNull(),
	assetId: integer().notNull(),
	position: varchar({ length: 20 }).notNull(),
	breakdown: json().notNull(),
	totalPoints: integer().notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
]);

export const dailyScoringBreakdowns = pgTable("dailyScoringBreakdowns", {
	id: serial().notNull(),
	dailyTeamScoreId: integer().notNull(),
	assetType: varchar({ length: 50 }).notNull(),
	assetId: integer().notNull(),
	position: varchar({ length: 20 }).notNull(),
	breakdown: json().notNull(),
	totalPoints: integer().notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
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
	index("strain_week_idx").on(table.year, table.week),
	unique("strain_week_unique").on(table.strainId, table.year, table.week),
]);

export const strainDailyStats = pgTable("strainDailyStats", {
	id: serial().notNull(),
	strainId: integer().notNull(),
	statDate: date({ mode: 'string' }).notNull(),
	favoriteCount: integer().default(0).notNull(),
	favoriteGrowth: integer().default(0).notNull(),
	pharmacyCount: integer().default(0).notNull(),
	pharmacyExpansion: integer().default(0).notNull(),
	avgPriceCents: integer().default(0).notNull(),
	priceStability: integer().default(0).notNull(),
	orderVolumeGrams: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("strain_daily_date_idx").on(table.statDate),
	unique("strain_daily_unique").on(table.strainId, table.statDate),
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
	priceCategory: varchar({ length: 50 }).default('average'),
	thcContent: varchar({ length: 50 }),
	cbdContent: varchar({ length: 50 }),
	genetics: varchar({ length: 50 }),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("strains_name_idx").on(table.name),
	index("strains_manufacturer_idx").on(table.manufacturerId),
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
	unique("league_user_idx").on(table.leagueId, table.userId),
]);

export const invitations = pgTable("invitations", {
	id: serial().notNull(),
	leagueId: integer().notNull(),
	email: varchar({ length: 255 }).notNull(),
	token: varchar({ length: 255 }).notNull(),
	invitedBy: integer().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	expiresAt: timestamp({ mode: 'string', withTimezone: true }).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	acceptedAt: timestamp({ mode: 'string', withTimezone: true }),
},
(table) => [
	index("invitations_token_idx").on(table.token),
	index("invitations_league_idx").on(table.leagueId),
	index("invitations_email_idx").on(table.email),
	unique("invitations_token_unique").on(table.token),
]);

export const trades = pgTable("trades", {
	id: serial().notNull(),
	leagueId: integer().notNull(),
	team1Id: integer().notNull(),
	team2Id: integer().notNull(),
	team1Assets: json().notNull(),
	team2Assets: json().notNull(),
	status: varchar({ length: 50 }).default('proposed').notNull(),
	proposedBy: integer().notNull(),
	processedWeek: integer(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
]);

export const users = pgTable("users", {
	id: serial().notNull(),
	openId: varchar({ length: 64 }).notNull(),
	name: text(),
	email: varchar({ length: 320 }),
	loginMethod: varchar({ length: 64 }),
	role: varchar({ length: 50 }).default('user').notNull(),
	currentPredictionStreak: integer().default(0).notNull(),
	longestPredictionStreak: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
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
	status: varchar({ length: 50 }).default('pending').notNull(),
	processedAt: timestamp({ mode: 'string', withTimezone: true }),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
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
	brd1Id: integer(),
	flexId: integer(),
	flexType: varchar({ length: 50 }),
	isLocked: integer().default(0).notNull(),
	lockedAt: timestamp({ mode: 'string', withTimezone: true }),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	unique("weekly_lineups_team_week_unique").on(table.teamId, table.year, table.week),
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
	brd1Points: integer().default(0).notNull(),
	flexPoints: integer().default(0).notNull(),
	bonusPoints: integer().default(0).notNull(),
	penaltyPoints: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	unique("weekly_team_scores_team_week_unique").on(table.teamId, table.year, table.week),
]);

export const dailyTeamScores = pgTable("dailyTeamScores", {
	id: serial().notNull(),
	challengeId: integer().notNull(),
	teamId: integer().notNull(),
	statDate: date({ mode: 'string' }).notNull(),
	mfg1Points: integer().default(0).notNull(),
	mfg2Points: integer().default(0).notNull(),
	cstr1Points: integer().default(0).notNull(),
	cstr2Points: integer().default(0).notNull(),
	prd1Points: integer().default(0).notNull(),
	prd2Points: integer().default(0).notNull(),
	phm1Points: integer().default(0).notNull(),
	phm2Points: integer().default(0).notNull(),
	brd1Points: integer().default(0).notNull(),
	flexPoints: integer().default(0).notNull(),
	bonusPoints: integer().default(0).notNull(),
	penaltyPoints: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("daily_scores_date_idx").on(table.statDate),
	index("daily_scores_challenge_idx").on(table.challengeId),
	unique("daily_scores_unique").on(table.challengeId, table.teamId, table.statDate),
]);


// Admin Dashboard - Sync Jobs and Logs
export const syncJobs = pgTable("syncJobs", {
	id: serial("id").primaryKey(),
	jobName: varchar("job_name", { length: 255 }).notNull(),
	status: varchar("status", { length: 50 }).default('pending').notNull(),
	details: text("details"),
	startedAt: timestamp("started_at", { mode: 'string', withTimezone: true }),
	completedAt: timestamp("completed_at", { mode: 'string', withTimezone: true }),
	processedCount: integer("processed_count").default(0),
	totalCount: integer("total_count").default(0),
	createdAt: timestamp("created_at", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("sync_jobs_status_idx").on(table.status),
	index("sync_jobs_created_at_idx").on(table.createdAt),
]);

export const syncLogs = pgTable("syncLogs", {
	id: serial("id").primaryKey(),
	jobId: integer("job_id").references(() => syncJobs.id).notNull(),
	level: varchar("level", { length: 50 }).notNull(),
	message: text("message").notNull(),
	metadata: json("metadata"),
	timestamp: timestamp("timestamp", { mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("sync_logs_job_id_idx").on(table.jobId),
	index("sync_logs_timestamp_idx").on(table.timestamp),
]);

// Daily Challenge Stats Tables
export * from './dailyChallengeSchema';

// ============================================================================
// PREDICTION STREAK TABLES
// ============================================================================

export const dailyMatchups = pgTable("dailyMatchups", {
	id: serial().notNull(),
	matchupDate: date({ mode: 'string' }).notNull(),
	entityType: varchar({ length: 50 }).notNull(),
	entityAId: integer().notNull(),
	entityBId: integer().notNull(),
	entityAName: varchar({ length: 255 }).notNull(),
	entityBName: varchar({ length: 255 }).notNull(),
	winnerId: integer(),
	entityAPoints: integer(),
	entityBPoints: integer(),
	isScored: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("matchup_date_idx").on(table.matchupDate),
	index("matchup_scored_idx").on(table.isScored),
	unique("matchup_unique").on(table.matchupDate, table.entityAId, table.entityBId),
]);

export const userPredictions = pgTable("userPredictions", {
	id: serial().notNull(),
	userId: integer().notNull(),
	matchupId: integer().notNull(),
	predictedWinnerId: integer().notNull(),
	isCorrect: integer(),
	submittedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("user_matchup_idx").on(table.userId, table.matchupId),
	index("user_predictions_date_idx").on(table.submittedAt),
	unique("user_matchup_unique").on(table.userId, table.matchupId),
]);
