-- SQL UPDATE statements for cannabis strain images (PostgreSQL)
-- Generated: 2025-11-26
-- Total strains: 36
-- Updated to use BunnyCDN URLs (cfls.b-cdn.net)

-- Note: Use LOWER(TRIM(name)) for case-insensitive matching
-- Some strain names have variations (e.g., "Ak47" vs "Ak 47", "Mac 1" vs "Mac1")

UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/ak-47_YWstNDc=.png' WHERE LOWER(TRIM(name)) = 'ak 47' OR name = 'Ak47';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/amnesia-haze_YW1uZXNpYS1oYXpl.png' WHERE LOWER(TRIM(name)) = 'amnesia haze';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/blue-dream_Ymx1ZS1kcmVhbQ==.png' WHERE LOWER(TRIM(name)) = 'blue dream';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/blueberry_Ymx1ZWJlcnJ5.png' WHERE LOWER(TRIM(name)) = 'blueberry';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/bubba-kush_YnViYmEta3VzaA==.png' WHERE LOWER(TRIM(name)) = 'bubba kush';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/chemdawg_Y2hlbWRhd2c=.png' WHERE LOWER(TRIM(name)) = 'chemdawg';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/cherry-pie_Y2hlcnJ5LXBpZQ==.png' WHERE LOWER(TRIM(name)) = 'cherry pie';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/cookies_Y29va2llcw==.png' WHERE LOWER(TRIM(name)) = 'cookies';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/critical-kush_Y3JpdGljYWwta3VzaA==.png' WHERE LOWER(TRIM(name)) = 'critical kush';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/do-si-dos_ZG8tc2ktZG9z.png' WHERE LOWER(TRIM(name)) = 'do si dos';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/durban-poison_ZHVyYmFuLXBvaXNvbg==.png' WHERE LOWER(TRIM(name)) = 'durban poison';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/gelato_Z2VsYXRv.png' WHERE LOWER(TRIM(name)) = 'gelato';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/girl-scout-cookies_Z2lybC1zY291dC1jb29raWVz.png' WHERE LOWER(TRIM(name)) = 'girl scout cookies';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/gorilla-glue_Z29yaWxsYS1nbHVl.png' WHERE LOWER(TRIM(name)) = 'gorilla glue';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/granddaddy-purple_Z3JhbmRkYWRkeS1wdXJwbGU=.png' WHERE LOWER(TRIM(name)) = 'granddaddy purple';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/green-crack_Z3JlZW4tY3JhY2s=.png' WHERE LOWER(TRIM(name)) = 'green crack';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/jack-herer_amFjay1oZXJlcg==.png' WHERE LOWER(TRIM(name)) = 'jack herer';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/lemon-haze_bGVtb24taGF6ZQ==.png' WHERE LOWER(TRIM(name)) = 'lemon haze';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/mac1_bWFjMQ==.png' WHERE LOWER(TRIM(name)) = 'mac1' OR name = 'Mac 1';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/northern-lights_bm9ydGhlcm4tbGlnaHRz.png' WHERE LOWER(TRIM(name)) = 'northern lights';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/og-kush_b2cta3VzaA==.png' WHERE LOWER(TRIM(name)) = 'og kush';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/pineapple-express_cGluZWFwcGxlLWV4cHJlc3M=.png' WHERE LOWER(TRIM(name)) = 'pineapple express';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/purple-haze_cHVycGxlLWhhemU=.png' WHERE LOWER(TRIM(name)) = 'purple haze';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/purple-punch_cHVycGxlLXB1bmNo.png' WHERE LOWER(TRIM(name)) = 'purple punch';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/runtz_cnVudHo=.png' WHERE LOWER(TRIM(name)) = 'runtz';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/skywalker-og_c2t5d2Fsa2VyLW9n.png' WHERE LOWER(TRIM(name)) = 'skywalker og';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/sour-diesel_c291ci1kaWVzZWw=.png' WHERE LOWER(TRIM(name)) = 'sour diesel';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/strawberry-cough_c3RyYXdiZXJyeS1jb3VnaA==.png' WHERE LOWER(TRIM(name)) = 'strawberry cough';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/sunset-sherbet_c3Vuc2V0LXNoZXJiZXQ=.png' WHERE LOWER(TRIM(name)) = 'sunset sherbet';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/super-lemon-haze_c3VwZXItbGVtb24taGF6ZQ==.png' WHERE LOWER(TRIM(name)) = 'super lemon haze';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/tangie_dGFuZ2ll.png' WHERE LOWER(TRIM(name)) = 'tangie';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/trainwreck_dHJhaW53cmVjaw==.png' WHERE LOWER(TRIM(name)) = 'trainwreck';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/wedding-cake_d2VkZGluZy1jYWtl.png' WHERE LOWER(TRIM(name)) = 'wedding cake';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/white-widow_d2hpdGUtd2lkb3c=.png' WHERE LOWER(TRIM(name)) = 'white widow';
UPDATE "cannabisStrains" SET "imageUrl" = 'https://cfls.b-cdn.net/strains/zkittlez_emtpdHRsZXo=.png' WHERE LOWER(TRIM(name)) = 'zkittlez';











