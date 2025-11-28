-- ========================================
-- BATCH 3 IMAGE ASSETS - SQL UPDATES
-- Cannabis Fantasy League
-- ========================================
-- Generated: 2025-11-26
-- New Strains: 7 images
-- New Manufacturers: 12 logos
-- Total New Assets: 19
-- ========================================

-- MANUFACTURER LOGOS
-- ========================================

-- Alien Labs
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/alien-labs_YWxpZW4tbGFicw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'alien-labs'
   OR LOWER(REPLACE(name, ' ', '')) = 'alienlabs';

-- Backpack Boyz
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/backpack-boyz_YmFja3BhY2stYm95eg==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'backpack-boyz'
   OR LOWER(REPLACE(name, ' ', '')) = 'backpackboyz';

-- Connected Cannabis
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/connected-cannabis_Y29ubmVjdGVkLWNhbm5hYmlz.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'connected-cannabis'
   OR LOWER(REPLACE(name, ' ', '')) = 'connectedcannabis';

-- Cookies
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/cookies_Y29va2llcw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'cookies'
   OR LOWER(REPLACE(name, ' ', '')) = 'cookies';

-- Cresco Labs
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/cresco-labs_Y3Jlc2NvLWxhYnM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'cresco-labs'
   OR LOWER(REPLACE(name, ' ', '')) = 'crescolabs';

-- Curaleaf
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/curaleaf_Y3VyYWxlYWY=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'curaleaf'
   OR LOWER(REPLACE(name, ' ', '')) = 'curaleaf';

-- Jeeter
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/jeeter_amVldGVy.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'jeeter'
   OR LOWER(REPLACE(name, ' ', '')) = 'jeeter';

-- Jungle Boys
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/jungle-boys_anVuZ2xlLWJveXM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'jungle-boys'
   OR LOWER(REPLACE(name, ' ', '')) = 'jungleboys';

-- Packwoods
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/packwoods_cGFja3dvb2Rz.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'packwoods'
   OR LOWER(REPLACE(name, ' ', '')) = 'packwoods';

-- Raw Garden
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/raw-garden_cmF3LWdhcmRlbg==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'raw-garden'
   OR LOWER(REPLACE(name, ' ', '')) = 'rawgarden';

-- Stiiizy
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/stiiizy_c3RpaWl6eQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'stiiizy'
   OR LOWER(REPLACE(name, ' ', '')) = 'stiiizy';

-- Trulieve
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/trulieve_dHJ1bGlldmU=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'trulieve'
   OR LOWER(REPLACE(name, ' ', '')) = 'trulieve';

-- ========================================
-- CANNABIS STRAIN IMAGES
-- ========================================

-- Blackberry Kush
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/blackberry-kush_YmxhY2tiZXJyeS1rdXNo.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'blackberry-kush'
   OR LOWER(REPLACE(name, ' ', '')) = 'blackberrykush'
   OR slug = 'blackberry-kush';

-- Candyland
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/candyland_Y2FuZHlsYW5k.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'candyland'
   OR LOWER(REPLACE(name, ' ', '')) = 'candyland'
   OR slug = 'candyland';

-- Chem 91
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/chem-91_Y2hlbS05MQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'chem-91'
   OR LOWER(REPLACE(name, ' ', '')) = 'chem91'
   OR slug = 'chem-91';

-- Chocolope
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/chocolope_Y2hvY29sb3Bl.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'chocolope'
   OR LOWER(REPLACE(name, ' ', '')) = 'chocolope'
   OR slug = 'chocolope';

-- Grape Ape
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/grape-ape_Z3JhcGUtYXBl.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'grape-ape'
   OR LOWER(REPLACE(name, ' ', '')) = 'grapeape'
   OR slug = 'grape-ape';

-- Headband
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/headband_aGVhZGJhbmQ=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'headband'
   OR LOWER(REPLACE(name, ' ', '')) = 'headband'
   OR slug = 'headband';

-- Lemon Skunk
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/lemon-skunk_bGVtb24tc2t1bms=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'lemon-skunk'
   OR LOWER(REPLACE(name, ' ', '')) = 'lemonskunk'
   OR slug = 'lemon-skunk';

-- ========================================
-- SUMMARY
-- ========================================
-- New manufacturers: 12
-- New strains: 7
-- Total new assets: 19
--
-- CUMULATIVE TOTALS:
-- Manufacturers: 43 (previous) + 12 (new) = 55
-- Strains: 80 (previous) + 7 (new) = 87
-- Grand Total: 142 assets
-- ========================================
