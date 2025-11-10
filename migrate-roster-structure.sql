-- Manual migration to update roster structure
-- Adds cannabis strains as a separate category from products

-- Step 1: Add new columns to weeklyLineups (if they don't exist)
ALTER TABLE `weeklyLineups` 
  ADD COLUMN IF NOT EXISTS `cstr1Id` INT NULL AFTER `mfg2Id`,
  ADD COLUMN IF NOT EXISTS `cstr2Id` INT NULL AFTER `cstr1Id`,
  ADD COLUMN IF NOT EXISTS `prd1Id` INT NULL AFTER `cstr2Id`,
  ADD COLUMN IF NOT EXISTS `prd2Id` INT NULL AFTER `prd1Id`;

-- Step 2: Migrate data from old columns to new columns
-- str1 → cstr1, str2 → cstr2, str3 → prd1, str4 → prd2
UPDATE `weeklyLineups` SET 
  `cstr1Id` = `str1Id`,
  `cstr2Id` = `str2Id`,
  `prd1Id` = `str3Id`,
  `prd2Id` = `str4Id`
WHERE `str1Id` IS NOT NULL OR `str2Id` IS NOT NULL OR `str3Id` IS NOT NULL OR `str4Id` IS NOT NULL;

-- Step 3: Drop old columns (only if new columns exist)
ALTER TABLE `weeklyLineups`
  DROP COLUMN IF EXISTS `str1Id`,
  DROP COLUMN IF EXISTS `str2Id`,
  DROP COLUMN IF EXISTS `str3Id`,
  DROP COLUMN IF EXISTS `str4Id`;

-- Step 4: Add new columns to weeklyTeamScores
ALTER TABLE `weeklyTeamScores`
  ADD COLUMN IF NOT EXISTS `cstr1Points` INT NOT NULL DEFAULT 0 AFTER `mfg2Points`,
  ADD COLUMN IF NOT EXISTS `cstr2Points` INT NOT NULL DEFAULT 0 AFTER `cstr1Points`,
  ADD COLUMN IF NOT EXISTS `prd1Points` INT NOT NULL DEFAULT 0 AFTER `cstr2Points`,
  ADD COLUMN IF NOT EXISTS `prd2Points` INT NOT NULL DEFAULT 0 AFTER `prd1Points`;

-- Step 5: Migrate points data
UPDATE `weeklyTeamScores` SET
  `cstr1Points` = COALESCE(`str1Points`, 0),
  `cstr2Points` = COALESCE(`str2Points`, 0),
  `prd1Points` = COALESCE(`str3Points`, 0),
  `prd2Points` = COALESCE(`str4Points`, 0)
WHERE 1=1;

-- Step 6: Drop old point columns
ALTER TABLE `weeklyTeamScores`
  DROP COLUMN IF EXISTS `str1Points`,
  DROP COLUMN IF EXISTS `str2Points`,
  DROP COLUMN IF EXISTS `str3Points`,
  DROP COLUMN IF EXISTS `str4Points`;

-- Step 7: Update enum values for rosters.assetType
-- Add new values first
ALTER TABLE `rosters` MODIFY COLUMN `assetType` 
  ENUM('manufacturer', 'strain', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

-- Step 8: Migrate existing 'strain' to 'product' in rosters
UPDATE `rosters` SET `assetType` = 'product' WHERE `assetType` = 'strain';

-- Step 9: Remove old 'strain' from enum
ALTER TABLE `rosters` MODIFY COLUMN `assetType`
  ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

-- Step 10: Update flexType enum in weeklyLineups
ALTER TABLE `weeklyLineups` MODIFY COLUMN `flexType`
  ENUM('manufacturer', 'strain', 'cannabis_strain', 'product', 'pharmacy');

UPDATE `weeklyLineups` SET `flexType` = 'product' WHERE `flexType` = 'strain';

ALTER TABLE `weeklyLineups` MODIFY COLUMN `flexType`
  ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy');

-- Step 11: Update waiverClaims enums
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

-- Step 12: Update challengeRosters assetType enum
ALTER TABLE `challengeRosters` MODIFY COLUMN `assetType`
  ENUM('manufacturer', 'strain', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

UPDATE `challengeRosters` SET `assetType` = 'product' WHERE `assetType` = 'strain';

ALTER TABLE `challengeRosters` MODIFY COLUMN `assetType`
  ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy') NOT NULL;

-- Migration complete!
SELECT 'Roster structure migration completed successfully!' as status;
