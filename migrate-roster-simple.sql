-- Simplified migration for roster structure

-- Add remaining new columns to weeklyLineups
ALTER TABLE `weeklyLineups` ADD COLUMN `cstr2Id` INT NULL;
ALTER TABLE `weeklyLineups` ADD COLUMN `prd1Id` INT NULL;
ALTER TABLE `weeklyLineups` ADD COLUMN `prd2Id` INT NULL;

-- Migrate data from old columns
UPDATE `weeklyLineups` SET 
  `cstr1Id` = `str1Id`,
  `cstr2Id` = `str2Id`,
  `prd1Id` = `str3Id`,
  `prd2Id` = `str4Id`;

-- Drop old columns
ALTER TABLE `weeklyLineups` DROP COLUMN `str1Id`;
ALTER TABLE `weeklyLineups` DROP COLUMN `str2Id`;
ALTER TABLE `weeklyLineups` DROP COLUMN `str3Id`;
ALTER TABLE `weeklyLineups` DROP COLUMN `str4Id`;

-- Add new columns to weeklyTeamScores
ALTER TABLE `weeklyTeamScores` ADD COLUMN `cstr1Points` INT NOT NULL DEFAULT 0;
ALTER TABLE `weeklyTeamScores` ADD COLUMN `cstr2Points` INT NOT NULL DEFAULT 0;
ALTER TABLE `weeklyTeamScores` ADD COLUMN `prd1Points` INT NOT NULL DEFAULT 0;
ALTER TABLE `weeklyTeamScores` ADD COLUMN `prd2Points` INT NOT NULL DEFAULT 0;

-- Migrate points data
UPDATE `weeklyTeamScores` SET
  `cstr1Points` = COALESCE(`str1Points`, 0),
  `cstr2Points` = COALESCE(`str2Points`, 0),
  `prd1Points` = COALESCE(`str3Points`, 0),
  `prd2Points` = COALESCE(`str4Points`, 0);

-- Drop old point columns
ALTER TABLE `weeklyTeamScores` DROP COLUMN `str1Points`;
ALTER TABLE `weeklyTeamScores` DROP COLUMN `str2Points`;
ALTER TABLE `weeklyTeamScores` DROP COLUMN `str3Points`;
ALTER TABLE `weeklyTeamScores` DROP COLUMN `str4Points`;

-- Update rosters assetType enum
ALTER TABLE `rosters` MODIFY COLUMN `assetType` 
  ENUM('manufacturer', 'strain', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

UPDATE `rosters` SET `assetType` = 'product' WHERE `assetType` = 'strain';

ALTER TABLE `rosters` MODIFY COLUMN `assetType`
  ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

-- Update weeklyLineups flexType enum
ALTER TABLE `weeklyLineups` MODIFY COLUMN `flexType`
  ENUM('manufacturer', 'strain', 'cannabis_strain', 'product', 'pharmacy');

UPDATE `weeklyLineups` SET `flexType` = 'product' WHERE `flexType` = 'strain';

ALTER TABLE `weeklyLineups` MODIFY COLUMN `flexType`
  ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy');

-- Update waiverClaims enums
ALTER TABLE `waiverClaims` MODIFY COLUMN `addAssetType`
  ENUM('manufacturer', 'strain', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

ALTER TABLE `waiverClaims` MODIFY COLUMN `dropAssetType`
  ENUM('manufacturer', 'strain', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

UPDATE `waiverClaims` SET `addAssetType` = 'product' WHERE `addAssetType` = 'strain';
UPDATE `waiverClaims` SET `dropAssetType` = 'product' WHERE `dropAssetType` = 'strain';

ALTER TABLE `waiverClaims` MODIFY COLUMN `addAssetType`
  ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

ALTER TABLE `waiverClaims` MODIFY COLUMN `dropAssetType`
  ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

-- Update challengeRosters assetType enum
ALTER TABLE `challengeRosters` MODIFY COLUMN `assetType`
  ENUM('manufacturer', 'strain', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

UPDATE `challengeRosters` SET `assetType` = 'product' WHERE `assetType` = 'strain';

ALTER TABLE `challengeRosters` MODIFY COLUMN `assetType`
  ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

SELECT 'Migration completed!' as status;
