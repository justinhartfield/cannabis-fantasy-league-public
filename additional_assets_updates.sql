-- ========================================
-- ADDITIONAL IMAGE ASSETS - SQL UPDATES
-- Cannabis Fantasy League
-- ========================================
-- Generated: 2025-11-26
-- New Strains: 9 images
-- New Manufacturers: 1 logos
-- ========================================

-- NEW MANUFACTURER LOGOS
-- ========================================

-- Jushi
UPDATE manufacturers
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/jushi_anVzaGk=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'jushi'
   OR LOWER(REPLACE(name, ' ', '')) = 'jushi';

-- ========================================
-- NEW CANNABIS STRAIN IMAGES
-- ========================================

-- Biscotti
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/biscotti_YmlzY290dGk=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'biscotti'
   OR LOWER(REPLACE(name, ' ', '')) = 'biscotti'
   OR slug = 'biscotti';

-- Gmo Cookies
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/gmo-cookies_Z21vLWNvb2tpZXM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'gmo-cookies'
   OR LOWER(REPLACE(name, ' ', '')) = 'gmocookies'
   OR slug = 'gmo-cookies';

-- Gorilla Cookies
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/gorilla-cookies_Z29yaWxsYS1jb29raWVz.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'gorilla-cookies'
   OR LOWER(REPLACE(name, ' ', '')) = 'gorillacookies'
   OR slug = 'gorilla-cookies';

-- Jet Fuel
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/jet-fuel_amV0LWZ1ZWw=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'jet-fuel'
   OR LOWER(REPLACE(name, ' ', '')) = 'jetfuel'
   OR slug = 'jet-fuel';

-- Lemon Cherry Gelato
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/lemon-cherry-gelato_bGVtb24tY2hlcnJ5LWdlbGF0bw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'lemon-cherry-gelato'
   OR LOWER(REPLACE(name, ' ', '')) = 'lemoncherrygelato'
   OR slug = 'lemon-cherry-gelato';

-- Purple Punch
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/purple-punch_cHVycGxlLXB1bmNo.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'purple-punch'
   OR LOWER(REPLACE(name, ' ', '')) = 'purplepunch'
   OR slug = 'purple-punch';

-- Slurricane
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/slurricane_c2x1cnJpY2FuZQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'slurricane'
   OR LOWER(REPLACE(name, ' ', '')) = 'slurricane'
   OR slug = 'slurricane';

-- Sunset Sherbet
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/sunset-sherbet_c3Vuc2V0LXNoZXJiZXQ=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'sunset-sherbet'
   OR LOWER(REPLACE(name, ' ', '')) = 'sunsetsherbet'
   OR slug = 'sunset-sherbet';

-- Tropicana Cookies
UPDATE "cannabisStrains"
SET "imageUrl" = 'https://cfls.b-cdn.net/strains/tropicana-cookies_dHJvcGljYW5hLWNvb2tpZXM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'tropicana-cookies'
   OR LOWER(REPLACE(name, ' ', '')) = 'tropicanacookies'
   OR slug = 'tropicana-cookies';

-- ========================================
-- SUMMARY
-- ========================================
-- New manufacturers: 1
-- New strains: 9
-- Total new assets: 10
-- ========================================
