CREATE TABLE `cannabisStrains` (
	`id` int AUTO_INCREMENT NOT NULL,
	`metabaseId` varchar(64),
	`name` varchar(255) NOT NULL,
	`slug` varchar(255),
	`type` enum('sativa','indica','hybrid'),
	`description` text,
	`effects` json,
	`flavors` json,
	`terpenes` json,
	`thcMin` int,
	`thcMax` int,
	`cbdMin` int,
	`cbdMax` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cannabisStrains_id` PRIMARY KEY(`id`),
	CONSTRAINT `cannabisStrains_metabaseId_unique` UNIQUE(`metabaseId`),
	CONSTRAINT `cannabisStrains_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `strains` ADD `metabaseId` varchar(64);--> statement-breakpoint
ALTER TABLE `strains` ADD `strainId` int;--> statement-breakpoint
ALTER TABLE `strains` ADD `strainName` varchar(255);--> statement-breakpoint
ALTER TABLE `strains` ADD CONSTRAINT `strains_metabaseId_unique` UNIQUE(`metabaseId`);--> statement-breakpoint
CREATE INDEX `name_idx` ON `cannabisStrains` (`name`);--> statement-breakpoint
CREATE INDEX `slug_idx` ON `cannabisStrains` (`slug`);