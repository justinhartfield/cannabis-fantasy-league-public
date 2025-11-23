-- 2025-11-22: Move miscategorized manufacturers into the brands domain
BEGIN;

CREATE TEMP TABLE brand_migration_ids (id integer PRIMARY KEY);

INSERT INTO brand_migration_ids (id) VALUES
  (1),
  (2),
  (3),
  (9),
  (10),
  (14),
  (16),
  (17),
  (18),
  (19),
  (20),
  (21),
  (22),
  (26),
  (27),
  (28),
  (29),
  (30),
  (32),
  (33),
  (34),
  (35),
  (36),
  (37),
  (40),
  (43),
  (44),
  (46),
  (47),
  (49),
  (50),
  (52),
  (53),
  (55),
  (56),
  (57),
  (59),
  (60),
  (61),
  (62),
  (64),
  (65),
  (66),
  (67),
  (70),
  (71),
  (72),
  (73),
  (74),
  (76),
  (77),
  (80),
  (81),
  (82),
  (83),
  (84),
  (85),
  (87),
  (88),
  (89),
  (90),
  (92),
  (94),
  (95),
  (96),
  (98),
  (99),
  (100),
  (101),
  (102),
  (103),
  (105),
  (106),
  (107),
  (108),
  (109),
  (110),
  (112),
  (113),
  (114),
  (117),
  (118),
  (119),
  (120),
  (121),
  (123),
  (124),
  (125),
  (126),
  (127),
  (128),
  (129),
  (131),
  (132),
  (133),
  (135),
  (136),
  (137),
  (138),
  (140),
  (141),
  (142),
  (143),
  (144),
  (145),
  (146),
  (147),
  (149),
  (151),
  (1006),
  (1014),
  (1015),
  (1017),
  (1018),
  (1019),
  (1022),
  (1023);

CREATE TEMP TABLE brand_migration_entities AS
SELECT *
FROM "manufacturers"
WHERE "id" IN (SELECT id FROM brand_migration_ids);

DO $$
DECLARE
  expected_count CONSTANT integer := 117;
  actual_count integer;
BEGIN
  SELECT COUNT(*) INTO actual_count FROM brand_migration_entities;
  IF actual_count <> expected_count THEN
    RAISE EXCEPTION 'Brand migration expected % entries, found %', expected_count, actual_count;
  END IF;
END $$;

-- Remove dependent manufacturer stats for migrating entities
DELETE FROM "manufacturerDailyChallengeStats" WHERE "manufacturerId" IN (SELECT id FROM brand_migration_ids);
DELETE FROM "manufacturerDailyStats" WHERE "manufacturerId" IN (SELECT id FROM brand_migration_ids);
DELETE FROM "manufacturerWeeklyStats" WHERE "manufacturerId" IN (SELECT id FROM brand_migration_ids);

-- Remove any existing brand stats that might collide with the new IDs
DELETE FROM "brandDailyChallengeStats" WHERE "brandId" IN (SELECT id FROM brand_migration_ids);
DELETE FROM "brandDailyStats" WHERE "brandId" IN (SELECT id FROM brand_migration_ids);
DELETE FROM "brandWeeklyStats" WHERE "brandId" IN (SELECT id FROM brand_migration_ids);
DELETE FROM "brands"
WHERE "id" IN (SELECT id FROM brand_migration_ids)
   OR "name" IN (SELECT "name" FROM brand_migration_entities);

-- Insert the manufacturers into the brands table with the new CDN path
INSERT INTO "brands" (
  "id",
  "name",
  "slug",
  "description",
  "logoUrl",
  "websiteUrl",
  "totalFavorites",
  "totalViews",
  "totalComments",
  "affiliateClicks",
  "createdAt",
  "updatedAt"
)
SELECT
  e."id",
  e."name",
  NULLIF(trim(both '-' FROM regexp_replace(lower(e."name"), '[^a-z0-9]+', '-', 'g')), ''),
  NULL,
  CASE
    WHEN e."logoUrl" ILIKE 'https://cfls.b-cdn.net/manufacturers/%' THEN replace(e."logoUrl", 'https://cfls.b-cdn.net/manufacturers/', 'https://cfls.b-cdn.net/brands/')
    ELSE e."logoUrl"
  END,
  NULL,
  0,
  0,
  0,
  0,
  e."createdAt",
  NOW()
FROM brand_migration_entities e
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "slug" = EXCLUDED."slug",
  "logoUrl" = EXCLUDED."logoUrl",
  "updatedAt" = NOW();

-- Re-point products to the new brand IDs
UPDATE "products"
SET "brandId" = "manufacturerId",
    "manufacturerId" = NULL,
    "updatedAt" = NOW()
WHERE "manufacturerId" IN (SELECT id FROM brand_migration_ids);

-- Clear manufacturer references from strains
UPDATE "strains"
SET "manufacturerId" = NULL,
    "updatedAt" = NOW()
WHERE "manufacturerId" IN (SELECT id FROM brand_migration_ids);

-- Update roster-style tables to treat these assets as brands
UPDATE "rosters"
SET "assetType" = 'brand'
WHERE "assetType" = 'manufacturer' AND "assetId" IN (SELECT id FROM brand_migration_ids);

UPDATE "challengeRosters"
SET "assetType" = 'brand'
WHERE "assetType" = 'manufacturer' AND "assetId" IN (SELECT id FROM brand_migration_ids);

UPDATE "draftPicks"
SET "assetType" = 'brand'
WHERE "assetType" = 'manufacturer' AND "assetId" IN (SELECT id FROM brand_migration_ids);

UPDATE "waiverClaims"
SET "addAssetType" = CASE WHEN "addAssetType" = 'manufacturer' AND "addAssetId" IN (SELECT id FROM brand_migration_ids) THEN 'brand' ELSE "addAssetType" END,
    "dropAssetType" = CASE WHEN "dropAssetType" = 'manufacturer' AND "dropAssetId" IN (SELECT id FROM brand_migration_ids) THEN 'brand' ELSE "dropAssetType" END
WHERE ("addAssetType" = 'manufacturer' AND "addAssetId" IN (SELECT id FROM brand_migration_ids))
   OR ("dropAssetType" = 'manufacturer' AND "dropAssetId" IN (SELECT id FROM brand_migration_ids));

UPDATE "scoringBreakdowns"
SET "assetType" = 'brand'
WHERE "assetType" = 'manufacturer' AND "assetId" IN (SELECT id FROM brand_migration_ids);

UPDATE "dailyScoringBreakdowns"
SET "assetType" = 'brand'
WHERE "assetType" = 'manufacturer' AND "assetId" IN (SELECT id FROM brand_migration_ids);

-- Normalize flex slots that referenced the migrating IDs
UPDATE "weeklyLineups"
SET "flexType" = 'brand'
WHERE "flexId" IN (SELECT id FROM brand_migration_ids)
  AND ("flexType" IS NULL OR "flexType" = 'manufacturer');

-- Move manufacturer slots into the dedicated brand slot when available
UPDATE "weeklyLineups"
SET "brd1Id" = "mfg1Id",
    "mfg1Id" = NULL
WHERE "mfg1Id" IN (SELECT id FROM brand_migration_ids)
  AND ("brd1Id" IS NULL OR "brd1Id" = "mfg1Id");

UPDATE "weeklyLineups"
SET "brd1Id" = "mfg2Id",
    "mfg2Id" = NULL
WHERE "mfg2Id" IN (SELECT id FROM brand_migration_ids)
  AND ("brd1Id" IS NULL OR "brd1Id" = "mfg2Id");

-- Fall back to the flex slot when the brand slot is already occupied
UPDATE "weeklyLineups"
SET "flexId" = "mfg1Id",
    "flexType" = 'brand',
    "mfg1Id" = NULL
WHERE "mfg1Id" IN (SELECT id FROM brand_migration_ids)
  AND "brd1Id" IS NOT NULL
  AND "flexId" IS NULL;

UPDATE "weeklyLineups"
SET "flexId" = "mfg2Id",
    "flexType" = 'brand',
    "mfg2Id" = NULL
WHERE "mfg2Id" IN (SELECT id FROM brand_migration_ids)
  AND "brd1Id" IS NOT NULL
  AND "flexId" IS NULL;

-- Abort if any manufacturer slots still reference migrating IDs
DO $$
DECLARE
  conflict_count integer;
BEGIN
  SELECT COUNT(*) INTO conflict_count
  FROM "weeklyLineups"
  WHERE "mfg1Id" IN (SELECT id FROM brand_migration_ids)
     OR "mfg2Id" IN (SELECT id FROM brand_migration_ids);

  IF conflict_count > 0 THEN
    RAISE EXCEPTION 'Brand migration blocked: % weekly lineup manufacturer slots still reference migrating IDs. Please move them to the brand slot or flex slot before rerunning the migration.', conflict_count;
  END IF;
END $$;

-- Update daily matchup entity types when both sides are migrating brands
UPDATE "dailyMatchups"
SET "entityType" = 'brand'
WHERE "entityType" = 'manufacturer'
  AND "entityAId" IN (SELECT id FROM brand_migration_ids)
  AND "entityBId" IN (SELECT id FROM brand_migration_ids);

-- Ensure there are no mixed-type matchups that still reference the migrating IDs
DO $$
DECLARE
  mixed_count integer;
BEGIN
  SELECT COUNT(*) INTO mixed_count
  FROM "dailyMatchups"
  WHERE "entityType" = 'manufacturer'
    AND (
      ("entityAId" IN (SELECT id FROM brand_migration_ids) AND "entityBId" NOT IN (SELECT id FROM brand_migration_ids)) OR
      ("entityBId" IN (SELECT id FROM brand_migration_ids) AND "entityAId" NOT IN (SELECT id FROM brand_migration_ids))
    );

  IF mixed_count > 0 THEN
    RAISE EXCEPTION 'Brand migration blocked: % manufacturer matchups contain mixed asset types. Regenerate those matchups before rerunning.', mixed_count;
  END IF;
END $$;

-- Remove the migrated manufacturers
DELETE FROM "manufacturers" WHERE "id" IN (SELECT id FROM brand_migration_ids);

-- Keep the brands sequence aligned with the new primary keys
SELECT setval(
  pg_get_serial_sequence('brands', 'id'),
  COALESCE((SELECT MAX("id") FROM "brands"), 0)
);

COMMIT;

