CREATE TABLE "achievements" (
	"id" serial NOT NULL,
	"userId" integer NOT NULL,
	"achievementType" varchar(100) NOT NULL,
	"achievementName" varchar(255) NOT NULL,
	"description" text,
	"iconUrl" varchar(500),
	"earnedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brandWeeklyStats" (
	"id" serial NOT NULL,
	"brandId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"favorites" integer DEFAULT 0 NOT NULL,
	"favoriteGrowth" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"viewGrowth" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"commentGrowth" integer DEFAULT 0 NOT NULL,
	"affiliateClicks" integer DEFAULT 0 NOT NULL,
	"clickGrowth" integer DEFAULT 0 NOT NULL,
	"engagementRate" integer DEFAULT 0 NOT NULL,
	"sentimentScore" integer DEFAULT 0 NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brand_week_unique" UNIQUE("brandId","year","week")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" serial NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"description" text,
	"logoUrl" varchar(500),
	"websiteUrl" varchar(500),
	"totalFavorites" integer DEFAULT 0 NOT NULL,
	"totalViews" integer DEFAULT 0 NOT NULL,
	"totalComments" integer DEFAULT 0 NOT NULL,
	"affiliateClicks" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "brands_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "cannabisStrainWeeklyStats" (
	"id" serial NOT NULL,
	"cannabisStrainId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"totalFavorites" integer DEFAULT 0 NOT NULL,
	"pharmacyCount" integer DEFAULT 0 NOT NULL,
	"productCount" integer DEFAULT 0 NOT NULL,
	"avgPriceCents" integer DEFAULT 0 NOT NULL,
	"priceChange" integer DEFAULT 0 NOT NULL,
	"marketPenetration" integer DEFAULT 0 NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cannabis_strain_week_unique" UNIQUE("cannabisStrainId","year","week")
);
--> statement-breakpoint
CREATE TABLE "cannabisStrains" (
	"id" serial NOT NULL,
	"metabaseId" varchar(64),
	"name" varchar(255) NOT NULL,
	"slug" varchar(255),
	"type" varchar(50),
	"description" text,
	"effects" json,
	"flavors" json,
	"terpenes" json,
	"thcMin" integer,
	"thcMax" integer,
	"cbdMin" integer,
	"cbdMax" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cannabisStrains_metabaseId_unique" UNIQUE("metabaseId"),
	CONSTRAINT "cannabisStrains_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "challengeParticipants" (
	"id" serial NOT NULL,
	"challengeId" integer NOT NULL,
	"userId" integer NOT NULL,
	"draftPosition" integer,
	"finalScore" integer DEFAULT 0 NOT NULL,
	"finalRank" integer,
	"joinedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_user_idx" UNIQUE("challengeId","userId")
);
--> statement-breakpoint
CREATE TABLE "challengeRosters" (
	"id" serial NOT NULL,
	"challengeId" integer NOT NULL,
	"userId" integer NOT NULL,
	"assetType" varchar(50) NOT NULL,
	"assetId" integer NOT NULL,
	"draftRound" integer NOT NULL,
	"draftPick" integer NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_user_asset_idx" UNIQUE("challengeId","userId","assetType","assetId")
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" serial NOT NULL,
	"name" varchar(255) NOT NULL,
	"creatorUserId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"maxParticipants" integer DEFAULT 8 NOT NULL,
	"draftRounds" integer DEFAULT 5 NOT NULL,
	"status" varchar(50) DEFAULT 'open' NOT NULL,
	"draftStartTime" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draftPicks" (
	"id" serial NOT NULL,
	"leagueId" integer NOT NULL,
	"teamId" integer NOT NULL,
	"round" integer NOT NULL,
	"pickNumber" integer NOT NULL,
	"assetType" varchar(50) NOT NULL,
	"assetId" integer NOT NULL,
	"pickTime" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_pick_idx" UNIQUE("leagueId","pickNumber")
);
--> statement-breakpoint
CREATE TABLE "leagueMessages" (
	"id" serial NOT NULL,
	"leagueId" integer NOT NULL,
	"userId" integer NOT NULL,
	"message" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leagues" (
	"id" serial NOT NULL,
	"name" varchar(255) NOT NULL,
	"leagueCode" varchar(10),
	"commissionerUserId" integer NOT NULL,
	"teamCount" integer DEFAULT 10 NOT NULL,
	"draftType" varchar(50) DEFAULT 'snake' NOT NULL,
	"scoringType" varchar(50) DEFAULT 'standard' NOT NULL,
	"playoffTeams" integer DEFAULT 6 NOT NULL,
	"seasonYear" integer NOT NULL,
	"currentWeek" integer DEFAULT 1 NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"leagueType" varchar(50) DEFAULT 'season' NOT NULL,
	"draftDate" timestamp with time zone,
	"seasonStartDate" timestamp with time zone,
	"playoffStartWeek" integer DEFAULT 19 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"draftStarted" integer DEFAULT 0,
	"draftCompleted" integer DEFAULT 0,
	"currentDraftPick" integer DEFAULT 1,
	"currentDraftRound" integer DEFAULT 1,
	"draftPickTimeLimit" integer DEFAULT 120,
	CONSTRAINT "leagues_leagueCode_unique" UNIQUE("leagueCode")
);
--> statement-breakpoint
CREATE TABLE "manufacturerWeeklyStats" (
	"id" serial NOT NULL,
	"manufacturerId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"salesVolumeGrams" integer DEFAULT 0 NOT NULL,
	"growthRatePercent" integer DEFAULT 0 NOT NULL,
	"marketShareRank" integer NOT NULL,
	"rankChange" integer DEFAULT 0 NOT NULL,
	"productCount" integer DEFAULT 0 NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manufacturer_week_unique" UNIQUE("manufacturerId","year","week")
);
--> statement-breakpoint
CREATE TABLE "manufacturers" (
	"id" serial NOT NULL,
	"name" varchar(255) NOT NULL,
	"currentRank" integer,
	"weeklyRank" integer,
	"monthlyRank" integer,
	"quarterlyRank" integer,
	"productCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manufacturers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "matchups" (
	"id" serial NOT NULL,
	"leagueId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"team1Id" integer NOT NULL,
	"team2Id" integer NOT NULL,
	"team1Score" integer DEFAULT 0 NOT NULL,
	"team2Score" integer DEFAULT 0 NOT NULL,
	"winnerId" integer,
	"status" varchar(50) DEFAULT 'scheduled' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pharmacies" (
	"id" serial NOT NULL,
	"name" varchar(255) NOT NULL,
	"city" varchar(100),
	"state" varchar(100),
	"productCount" integer DEFAULT 0 NOT NULL,
	"weeklyRevenueCents" integer DEFAULT 0 NOT NULL,
	"weeklyOrderCount" integer DEFAULT 0 NOT NULL,
	"avgOrderSizeGrams" integer DEFAULT 0 NOT NULL,
	"customerRetentionRate" integer DEFAULT 0 NOT NULL,
	"appUsageRate" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pharmacies_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "pharmacyWeeklyStats" (
	"id" serial NOT NULL,
	"pharmacyId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"revenueCents" integer DEFAULT 0 NOT NULL,
	"orderCount" integer DEFAULT 0 NOT NULL,
	"avgOrderSizeGrams" integer DEFAULT 0 NOT NULL,
	"customerRetentionRate" integer DEFAULT 0 NOT NULL,
	"productVariety" integer DEFAULT 0 NOT NULL,
	"appUsageRate" integer DEFAULT 0 NOT NULL,
	"growthRatePercent" integer DEFAULT 0 NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pharmacy_week_unique" UNIQUE("pharmacyId","year","week")
);
--> statement-breakpoint
CREATE TABLE "rosters" (
	"id" serial NOT NULL,
	"teamId" integer NOT NULL,
	"assetType" varchar(50) NOT NULL,
	"assetId" integer NOT NULL,
	"acquiredWeek" integer NOT NULL,
	"acquiredVia" varchar(50) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_asset_idx" UNIQUE("teamId","assetType","assetId")
);
--> statement-breakpoint
CREATE TABLE "scoringBreakdowns" (
	"id" serial NOT NULL,
	"weeklyTeamScoreId" integer NOT NULL,
	"assetType" varchar(50) NOT NULL,
	"assetId" integer NOT NULL,
	"position" varchar(20) NOT NULL,
	"breakdown" json NOT NULL,
	"totalPoints" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "strainWeeklyStats" (
	"id" serial NOT NULL,
	"strainId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"favoriteCount" integer DEFAULT 0 NOT NULL,
	"favoriteGrowth" integer DEFAULT 0 NOT NULL,
	"pharmacyCount" integer DEFAULT 0 NOT NULL,
	"pharmacyExpansion" integer DEFAULT 0 NOT NULL,
	"avgPriceCents" integer NOT NULL,
	"priceStability" integer DEFAULT 0 NOT NULL,
	"orderVolumeGrams" integer DEFAULT 0 NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strain_week_unique" UNIQUE("strainId","year","week")
);
--> statement-breakpoint
CREATE TABLE "strains" (
	"id" serial NOT NULL,
	"metabaseId" varchar(64),
	"name" varchar(255) NOT NULL,
	"strainId" integer,
	"strainName" varchar(255),
	"manufacturerId" integer,
	"manufacturerName" varchar(255),
	"favoriteCount" integer DEFAULT 0 NOT NULL,
	"pharmacyCount" integer DEFAULT 0 NOT NULL,
	"avgPriceCents" integer NOT NULL,
	"minPriceCents" integer NOT NULL,
	"maxPriceCents" integer NOT NULL,
	"priceCategory" varchar(50) DEFAULT 'average',
	"thcContent" varchar(50),
	"cbdContent" varchar(50),
	"genetics" varchar(50),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "strains_metabaseId_unique" UNIQUE("metabaseId")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial NOT NULL,
	"leagueId" integer NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"draftPosition" integer,
	"waiverPriority" integer DEFAULT 1 NOT NULL,
	"faabBudget" integer DEFAULT 100 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"ties" integer DEFAULT 0 NOT NULL,
	"pointsFor" integer DEFAULT 0 NOT NULL,
	"pointsAgainst" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_user_idx" UNIQUE("leagueId","userId")
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial NOT NULL,
	"leagueId" integer NOT NULL,
	"team1Id" integer NOT NULL,
	"team2Id" integer NOT NULL,
	"team1Assets" json NOT NULL,
	"team2Assets" json NOT NULL,
	"status" varchar(50) DEFAULT 'proposed' NOT NULL,
	"proposedBy" integer NOT NULL,
	"processedWeek" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "waiverClaims" (
	"id" serial NOT NULL,
	"leagueId" integer NOT NULL,
	"teamId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"addAssetType" varchar(50) NOT NULL,
	"addAssetId" integer NOT NULL,
	"dropAssetType" varchar(50) NOT NULL,
	"dropAssetId" integer NOT NULL,
	"bidAmount" integer NOT NULL,
	"priority" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"processedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weeklyLineups" (
	"id" serial NOT NULL,
	"teamId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"mfg1Id" integer,
	"mfg2Id" integer,
	"cstr1Id" integer,
	"cstr2Id" integer,
	"prd1Id" integer,
	"prd2Id" integer,
	"phm1Id" integer,
	"phm2Id" integer,
	"brd1Id" integer,
	"flexId" integer,
	"flexType" varchar(50),
	"isLocked" integer DEFAULT 0 NOT NULL,
	"lockedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_lineups_team_week_unique" UNIQUE("teamId","year","week")
);
--> statement-breakpoint
CREATE TABLE "weeklyTeamScores" (
	"id" serial NOT NULL,
	"teamId" integer NOT NULL,
	"year" integer NOT NULL,
	"week" integer NOT NULL,
	"mfg1Points" integer DEFAULT 0 NOT NULL,
	"mfg2Points" integer DEFAULT 0 NOT NULL,
	"cstr1Points" integer DEFAULT 0 NOT NULL,
	"cstr2Points" integer DEFAULT 0 NOT NULL,
	"prd1Points" integer DEFAULT 0 NOT NULL,
	"prd2Points" integer DEFAULT 0 NOT NULL,
	"phm1Points" integer DEFAULT 0 NOT NULL,
	"phm2Points" integer DEFAULT 0 NOT NULL,
	"brd1Points" integer DEFAULT 0 NOT NULL,
	"flexPoints" integer DEFAULT 0 NOT NULL,
	"bonusPoints" integer DEFAULT 0 NOT NULL,
	"penaltyPoints" integer DEFAULT 0 NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weekly_team_scores_team_week_unique" UNIQUE("teamId","year","week")
);
--> statement-breakpoint
CREATE INDEX "brand_week_idx" ON "brandWeeklyStats" USING btree ("year","week");--> statement-breakpoint
CREATE INDEX "brands_name_idx" ON "brands" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cannabis_strain_week_idx" ON "cannabisStrainWeeklyStats" USING btree ("year","week");--> statement-breakpoint
CREATE INDEX "cannabis_strains_name_idx" ON "cannabisStrains" USING btree ("name");--> statement-breakpoint
CREATE INDEX "cannabis_strains_slug_idx" ON "cannabisStrains" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "league_time_idx" ON "leagueMessages" USING btree ("leagueId","createdAt");--> statement-breakpoint
CREATE INDEX "manufacturer_week_idx" ON "manufacturerWeeklyStats" USING btree ("year","week");--> statement-breakpoint
CREATE INDEX "manufacturers_name_idx" ON "manufacturers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "league_week_idx" ON "matchups" USING btree ("leagueId","year","week");--> statement-breakpoint
CREATE INDEX "pharmacies_name_idx" ON "pharmacies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "pharmacy_week_idx" ON "pharmacyWeeklyStats" USING btree ("year","week");--> statement-breakpoint
CREATE INDEX "strain_week_idx" ON "strainWeeklyStats" USING btree ("year","week");--> statement-breakpoint
CREATE INDEX "strains_name_idx" ON "strains" USING btree ("name");--> statement-breakpoint
CREATE INDEX "strains_manufacturer_idx" ON "strains" USING btree ("manufacturerId");