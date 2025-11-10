CREATE TABLE `achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`achievementType` varchar(100) NOT NULL,
	`achievementName` varchar(255) NOT NULL,
	`description` text,
	`iconUrl` varchar(500),
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `achievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `challengeParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`userId` int NOT NULL,
	`draftPosition` int,
	`finalScore` int NOT NULL DEFAULT 0,
	`finalRank` int,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challengeParticipants_id` PRIMARY KEY(`id`),
	CONSTRAINT `challenge_user_idx` UNIQUE(`challengeId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `challengeRosters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengeId` int NOT NULL,
	`userId` int NOT NULL,
	`assetType` enum('manufacturer','strain','pharmacy') NOT NULL,
	`assetId` int NOT NULL,
	`draftRound` int NOT NULL,
	`draftPick` int NOT NULL,
	`points` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `challengeRosters_id` PRIMARY KEY(`id`),
	CONSTRAINT `challenge_user_asset_idx` UNIQUE(`challengeId`,`userId`,`assetType`,`assetId`)
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`creatorUserId` int NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`maxParticipants` int NOT NULL DEFAULT 8,
	`draftRounds` int NOT NULL DEFAULT 5,
	`status` enum('open','drafting','active','completed') NOT NULL DEFAULT 'open',
	`draftStartTime` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `draftPicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`teamId` int NOT NULL,
	`round` int NOT NULL,
	`pickNumber` int NOT NULL,
	`assetType` enum('manufacturer','strain','pharmacy') NOT NULL,
	`assetId` int NOT NULL,
	`pickTime` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `draftPicks_id` PRIMARY KEY(`id`),
	CONSTRAINT `league_pick_idx` UNIQUE(`leagueId`,`pickNumber`)
);
--> statement-breakpoint
CREATE TABLE `leagueMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`userId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `leagueMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leagues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`commissionerUserId` int NOT NULL,
	`teamCount` int NOT NULL DEFAULT 10,
	`draftType` enum('snake','linear') NOT NULL DEFAULT 'snake',
	`scoringType` enum('standard','custom') NOT NULL DEFAULT 'standard',
	`playoffTeams` int NOT NULL DEFAULT 6,
	`seasonYear` int NOT NULL,
	`currentWeek` int NOT NULL DEFAULT 1,
	`status` enum('draft','active','playoffs','completed') NOT NULL DEFAULT 'draft',
	`draftDate` timestamp,
	`seasonStartDate` timestamp,
	`playoffStartWeek` int NOT NULL DEFAULT 19,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leagues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manufacturerWeeklyStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`manufacturerId` int NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`salesVolumeGrams` int NOT NULL DEFAULT 0,
	`growthRatePercent` int NOT NULL DEFAULT 0,
	`marketShareRank` int NOT NULL,
	`rankChange` int NOT NULL DEFAULT 0,
	`productCount` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manufacturerWeeklyStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `manufacturer_week_idx` UNIQUE(`manufacturerId`,`year`,`week`)
);
--> statement-breakpoint
CREATE TABLE `manufacturers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`currentRank` int,
	`weeklyRank` int,
	`monthlyRank` int,
	`quarterlyRank` int,
	`productCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manufacturers_id` PRIMARY KEY(`id`),
	CONSTRAINT `manufacturers_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `matchups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`team1Id` int NOT NULL,
	`team2Id` int NOT NULL,
	`team1Score` int NOT NULL DEFAULT 0,
	`team2Score` int NOT NULL DEFAULT 0,
	`winnerId` int,
	`status` enum('scheduled','in_progress','final') NOT NULL DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matchups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pharmacies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`city` varchar(100),
	`state` varchar(100),
	`productCount` int NOT NULL DEFAULT 0,
	`weeklyRevenueCents` int NOT NULL DEFAULT 0,
	`weeklyOrderCount` int NOT NULL DEFAULT 0,
	`avgOrderSizeGrams` int NOT NULL DEFAULT 0,
	`customerRetentionRate` int NOT NULL DEFAULT 0,
	`appUsageRate` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pharmacies_id` PRIMARY KEY(`id`),
	CONSTRAINT `pharmacies_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `pharmacyWeeklyStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pharmacyId` int NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`revenueCents` int NOT NULL DEFAULT 0,
	`orderCount` int NOT NULL DEFAULT 0,
	`avgOrderSizeGrams` int NOT NULL DEFAULT 0,
	`customerRetentionRate` int NOT NULL DEFAULT 0,
	`productVariety` int NOT NULL DEFAULT 0,
	`appUsageRate` int NOT NULL DEFAULT 0,
	`growthRatePercent` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pharmacyWeeklyStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `pharmacy_week_idx` UNIQUE(`pharmacyId`,`year`,`week`)
);
--> statement-breakpoint
CREATE TABLE `rosters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`assetType` enum('manufacturer','strain','pharmacy') NOT NULL,
	`assetId` int NOT NULL,
	`acquiredWeek` int NOT NULL,
	`acquiredVia` enum('draft','waiver','trade','free_agent') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rosters_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_asset_idx` UNIQUE(`teamId`,`assetType`,`assetId`)
);
--> statement-breakpoint
CREATE TABLE `scoringBreakdowns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weeklyTeamScoreId` int NOT NULL,
	`assetType` enum('manufacturer','strain','pharmacy') NOT NULL,
	`assetId` int NOT NULL,
	`position` varchar(20) NOT NULL,
	`breakdown` json NOT NULL,
	`totalPoints` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scoringBreakdowns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `strainWeeklyStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`strainId` int NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`favoriteCount` int NOT NULL DEFAULT 0,
	`favoriteGrowth` int NOT NULL DEFAULT 0,
	`pharmacyCount` int NOT NULL DEFAULT 0,
	`pharmacyExpansion` int NOT NULL DEFAULT 0,
	`avgPriceCents` int NOT NULL,
	`priceStability` int NOT NULL DEFAULT 0,
	`orderVolumeGrams` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `strainWeeklyStats_id` PRIMARY KEY(`id`),
	CONSTRAINT `strain_week_idx` UNIQUE(`strainId`,`year`,`week`)
);
--> statement-breakpoint
CREATE TABLE `strains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`manufacturerId` int,
	`manufacturerName` varchar(255),
	`favoriteCount` int NOT NULL DEFAULT 0,
	`pharmacyCount` int NOT NULL DEFAULT 0,
	`avgPriceCents` int NOT NULL,
	`minPriceCents` int NOT NULL,
	`maxPriceCents` int NOT NULL,
	`priceCategory` enum('excellent','below_average','average','above_average','expensive') DEFAULT 'average',
	`thcContent` varchar(50),
	`cbdContent` varchar(50),
	`genetics` enum('sativa','indica','hybrid'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `strains_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`draftPosition` int,
	`waiverPriority` int NOT NULL DEFAULT 1,
	`faabBudget` int NOT NULL DEFAULT 100,
	`wins` int NOT NULL DEFAULT 0,
	`losses` int NOT NULL DEFAULT 0,
	`ties` int NOT NULL DEFAULT 0,
	`pointsFor` int NOT NULL DEFAULT 0,
	`pointsAgainst` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `league_user_idx` UNIQUE(`leagueId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`team1Id` int NOT NULL,
	`team2Id` int NOT NULL,
	`team1Assets` json NOT NULL,
	`team2Assets` json NOT NULL,
	`status` enum('proposed','accepted','rejected','cancelled') NOT NULL DEFAULT 'proposed',
	`proposedBy` int NOT NULL,
	`processedWeek` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `waiverClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`leagueId` int NOT NULL,
	`teamId` int NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`addAssetType` enum('manufacturer','strain','pharmacy') NOT NULL,
	`addAssetId` int NOT NULL,
	`dropAssetType` enum('manufacturer','strain','pharmacy') NOT NULL,
	`dropAssetId` int NOT NULL,
	`bidAmount` int NOT NULL,
	`priority` int NOT NULL,
	`status` enum('pending','successful','failed') NOT NULL DEFAULT 'pending',
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `waiverClaims_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `weeklyLineups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`mfg1Id` int,
	`mfg2Id` int,
	`str1Id` int,
	`str2Id` int,
	`str3Id` int,
	`str4Id` int,
	`phm1Id` int,
	`phm2Id` int,
	`flexId` int,
	`flexType` enum('manufacturer','strain','pharmacy'),
	`isLocked` boolean NOT NULL DEFAULT false,
	`lockedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `weeklyLineups_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_week_idx` UNIQUE(`teamId`,`year`,`week`)
);
--> statement-breakpoint
CREATE TABLE `weeklyTeamScores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`year` int NOT NULL,
	`week` int NOT NULL,
	`mfg1Points` int NOT NULL DEFAULT 0,
	`mfg2Points` int NOT NULL DEFAULT 0,
	`str1Points` int NOT NULL DEFAULT 0,
	`str2Points` int NOT NULL DEFAULT 0,
	`str3Points` int NOT NULL DEFAULT 0,
	`str4Points` int NOT NULL DEFAULT 0,
	`phm1Points` int NOT NULL DEFAULT 0,
	`phm2Points` int NOT NULL DEFAULT 0,
	`flexPoints` int NOT NULL DEFAULT 0,
	`bonusPoints` int NOT NULL DEFAULT 0,
	`penaltyPoints` int NOT NULL DEFAULT 0,
	`totalPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `weeklyTeamScores_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_week_idx` UNIQUE(`teamId`,`year`,`week`)
);
--> statement-breakpoint
CREATE INDEX `league_time_idx` ON `leagueMessages` (`leagueId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `week_idx` ON `manufacturerWeeklyStats` (`year`,`week`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `manufacturers` (`name`);--> statement-breakpoint
CREATE INDEX `league_week_idx` ON `matchups` (`leagueId`,`year`,`week`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `pharmacies` (`name`);--> statement-breakpoint
CREATE INDEX `week_idx` ON `pharmacyWeeklyStats` (`year`,`week`);--> statement-breakpoint
CREATE INDEX `week_idx` ON `strainWeeklyStats` (`year`,`week`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `strains` (`name`);--> statement-breakpoint
CREATE INDEX `manufacturer_idx` ON `strains` (`manufacturerId`);