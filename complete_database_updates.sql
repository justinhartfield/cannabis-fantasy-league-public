-- ========================================
-- COMPLETE DATABASE UPDATES - SQL VERSION
-- Cannabis Fantasy League - Image Assets
-- ========================================
-- Generated: 2025-11-26
-- Manufacturers: 37 logos
-- Strains: 40 images
-- ========================================

-- MANUFACTURER LOGO UPDATES
-- ========================================

-- Cannasseur Club
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/cannasseur-club_Y2FubmFzc2V1ci1jbHVi.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'cannasseur-club'
   OR LOWER(REPLACE(name, ' ', '')) = 'cannasseurclub'
   OR slug = 'cannasseur-club';

-- Drapalin
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/drapalin_ZHJhcGFsaW4=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'drapalin'
   OR LOWER(REPLACE(name, ' ', '')) = 'drapalin'
   OR slug = 'drapalin';

-- Dutch Passion
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/dutch-passion_ZHV0Y2gtcGFzc2lvbg==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'dutch-passion'
   OR LOWER(REPLACE(name, ' ', '')) = 'dutchpassion'
   OR slug = 'dutch-passion';

-- Easyhomegrowing
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/easyhomegrowing_ZWFzeWhvbWVncm93aW5n.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'easyhomegrowing'
   OR LOWER(REPLACE(name, ' ', '')) = 'easyhomegrowing'
   OR slug = 'easyhomegrowing';

-- Enua
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/enua_ZW51YQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'enua'
   OR LOWER(REPLACE(name, ' ', '')) = 'enua'
   OR slug = 'enua';

-- Focus V
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/focus-v_Zm9jdXMtdg==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'focus-v'
   OR LOWER(REPLACE(name, ' ', '')) = 'focusv'
   OR slug = 'focus-v';

-- G13 Labs
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/g13-labs_ZzEzLWxhYnM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'g13-labs'
   OR LOWER(REPLACE(name, ' ', '')) = 'g13labs'
   OR slug = 'g13-labs';

-- Green House Seed Co
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/green-house-seed-co_Z3JlZW4taG91c2Utc2VlZC1jbw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'green-house-seed-co'
   OR LOWER(REPLACE(name, ' ', '')) = 'greenhouseseedco'
   OR slug = 'green-house-seed-co';

-- Grove Bags
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/grove-bags_Z3JvdmUtYmFncw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'grove-bags'
   OR LOWER(REPLACE(name, ' ', '')) = 'grovebags'
   OR slug = 'grove-bags';

-- Hanf Im Gluck
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/hanf-im-gluck_aGFuZi1pbS1nbHVjaw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'hanf-im-gluck'
   OR LOWER(REPLACE(name, ' ', '')) = 'hanfimgluck'
   OR slug = 'hanf-im-gluck';

-- Hazefly
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/hazefly_aGF6ZWZseQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'hazefly'
   OR LOWER(REPLACE(name, ' ', '')) = 'hazefly'
   OR slug = 'hazefly';

-- Hempcrew
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/hempcrew_aGVtcGNyZXc=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'hempcrew'
   OR LOWER(REPLACE(name, ' ', '')) = 'hempcrew'
   OR slug = 'hempcrew';

-- Hemper
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/hemper_aGVtcGVy.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'hemper'
   OR LOWER(REPLACE(name, ' ', '')) = 'hemper'
   OR slug = 'hemper';

-- Kailar
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/kailar_a2FpbGFy.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'kailar'
   OR LOWER(REPLACE(name, ' ', '')) = 'kailar'
   OR slug = 'kailar';

-- Luvo
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/luvo_bHV2bw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'luvo'
   OR LOWER(REPLACE(name, ' ', '')) = 'luvo'
   OR slug = 'luvo';

-- Malantis
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/malantis_bWFsYW50aXM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'malantis'
   OR LOWER(REPLACE(name, ' ', '')) = 'malantis'
   OR slug = 'malantis';

-- Mediprocan
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/mediprocan_bWVkaXByb2Nhbg==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'mediprocan'
   OR LOWER(REPLACE(name, ' ', '')) = 'mediprocan'
   OR slug = 'mediprocan';

-- Nevernot
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/nevernot_bmV2ZXJub3Q=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'nevernot'
   OR LOWER(REPLACE(name, ' ', '')) = 'nevernot'
   OR slug = 'nevernot';

-- Noids
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/noids_bm9pZHM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'noids'
   OR LOWER(REPLACE(name, ' ', '')) = 'noids'
   OR slug = 'noids';

-- Original Kavatza
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/original-kavatza_b3JpZ2luYWwta2F2YXR6YQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'original-kavatza'
   OR LOWER(REPLACE(name, ' ', '')) = 'originalkavatza'
   OR slug = 'original-kavatza';

-- Pax
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/pax_cGF4.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'pax'
   OR LOWER(REPLACE(name, ' ', '')) = 'pax'
   OR slug = 'pax';

-- Peace Naturals
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/peace-naturals_cGVhY2UtbmF0dXJhbHM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'peace-naturals'
   OR LOWER(REPLACE(name, ' ', '')) = 'peacenaturals'
   OR slug = 'peace-naturals';

-- Remexian Pharma
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/remexian-pharma_cmVtZXhpYW4tcGhhcm1h.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'remexian-pharma'
   OR LOWER(REPLACE(name, ' ', '')) = 'remexianpharma'
   OR slug = 'remexian-pharma';

-- Royal Queen Seeds
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/royal-queen-seeds_cm95YWwtcXVlZW4tc2VlZHM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'royal-queen-seeds'
   OR LOWER(REPLACE(name, ' ', '')) = 'royalqueenseeds'
   OR slug = 'royal-queen-seeds';

-- Seedstockers
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/seedstockers_c2VlZHN0b2NrZXJz.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'seedstockers'
   OR LOWER(REPLACE(name, ' ', '')) = 'seedstockers'
   OR slug = 'seedstockers';

-- Skunky Monkey
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/skunky-monkey_c2t1bmt5LW1vbmtleQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'skunky-monkey'
   OR LOWER(REPLACE(name, ' ', '')) = 'skunkymonkey'
   OR slug = 'skunky-monkey';

-- Smoking
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/smoking_c21va2luZw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'smoking'
   OR LOWER(REPLACE(name, ' ', '')) = 'smoking'
   OR slug = 'smoking';

-- Spliffers
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/spliffers_c3BsaWZmZXJz.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'spliffers'
   OR LOWER(REPLACE(name, ' ', '')) = 'spliffers'
   OR slug = 'spliffers';

-- Storz Bickel
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/storz-bickel_c3RvcnotYmlja2Vs.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'storz-bickel'
   OR LOWER(REPLACE(name, ' ', '')) = 'storzbickel'
   OR slug = 'storz-bickel';

-- Treez Club
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/treez-club_dHJlZXotY2x1Yg==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'treez-club'
   OR LOWER(REPLACE(name, ' ', '')) = 'treezclub'
   OR slug = 'treez-club';

-- Treez Tools
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/treez-tools_dHJlZXotdG9vbHM=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'treez-tools'
   OR LOWER(REPLACE(name, ' ', '')) = 'treeztools'
   OR slug = 'treez-tools';

-- Tyson 2 0
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/tyson-2-0_dHlzb24tMi0w.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'tyson-2-0'
   OR LOWER(REPLACE(name, ' ', '')) = 'tyson20'
   OR slug = 'tyson-2-0';

-- Vapes N Dabs
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/vapes-n-dabs_dmFwZXMtbi1kYWJz.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'vapes-n-dabs'
   OR LOWER(REPLACE(name, ' ', '')) = 'vapesndabs'
   OR slug = 'vapes-n-dabs';

-- Vayamed
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/vayamed_dmF5YW1lZA==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'vayamed'
   OR LOWER(REPLACE(name, ' ', '')) = 'vayamed'
   OR slug = 'vayamed';

-- Vonblute
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/vonblute_dm9uYmx1dGU=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'vonblute'
   OR LOWER(REPLACE(name, ' ', '')) = 'vonblute'
   OR slug = 'vonblute';

-- Weeco
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/weeco_d2VlY28=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'weeco'
   OR LOWER(REPLACE(name, ' ', '')) = 'weeco'
   OR slug = 'weeco';

-- Weedo
UPDATE "Manufacturer"
SET "logoUrl" = 'https://cfls.b-cdn.net/manufacturers/weedo_d2VlZG8=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'weedo'
   OR LOWER(REPLACE(name, ' ', '')) = 'weedo'
   OR slug = 'weedo';

-- ========================================
-- STRAIN IMAGE UPDATES
-- ========================================

-- Ak 47
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/ak-47_YWstNDc=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'ak-47'
   OR LOWER(REPLACE(name, ' ', '')) = 'ak47'
   OR slug = 'ak-47';

-- Amnesia Haze
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/amnesia-haze_YW1uZXNpYS1oYXpl.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'amnesia-haze'
   OR LOWER(REPLACE(name, ' ', '')) = 'amnesiahaze'
   OR slug = 'amnesia-haze';

-- Blue Dream
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/blue-dream_Ymx1ZS1kcmVhbQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'blue-dream'
   OR LOWER(REPLACE(name, ' ', '')) = 'bluedream'
   OR slug = 'blue-dream';

-- Blueberry
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/blueberry_Ymx1ZWJlcnJ5.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'blueberry'
   OR LOWER(REPLACE(name, ' ', '')) = 'blueberry'
   OR slug = 'blueberry';

-- Bubba Kush
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/bubba-kush_YnViYmEta3VzaA==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'bubba-kush'
   OR LOWER(REPLACE(name, ' ', '')) = 'bubbakush'
   OR slug = 'bubba-kush';

-- Cereal Milk
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/cereal-milk_Y2VyZWFsLW1pbGs=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'cereal-milk'
   OR LOWER(REPLACE(name, ' ', '')) = 'cerealmilk'
   OR slug = 'cereal-milk';

-- Chemdawg
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/chemdawg_Y2hlbWRhd2c=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'chemdawg'
   OR LOWER(REPLACE(name, ' ', '')) = 'chemdawg'
   OR slug = 'chemdawg';

-- Cherry Pie
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/cherry-pie_Y2hlcnJ5LXBpZQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'cherry-pie'
   OR LOWER(REPLACE(name, ' ', '')) = 'cherrypie'
   OR slug = 'cherry-pie';

-- Cookies
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/cookies_Y29va2llcw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'cookies'
   OR LOWER(REPLACE(name, ' ', '')) = 'cookies'
   OR slug = 'cookies';

-- Critical Kush
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/critical-kush_Y3JpdGljYWwta3VzaA==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'critical-kush'
   OR LOWER(REPLACE(name, ' ', '')) = 'criticalkush'
   OR slug = 'critical-kush';

-- Do Si Dos
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/do-si-dos_ZG8tc2ktZG9z.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'do-si-dos'
   OR LOWER(REPLACE(name, ' ', '')) = 'dosidos'
   OR slug = 'do-si-dos';

-- Durban Poison
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/durban-poison_ZHVyYmFuLXBvaXNvbg==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'durban-poison'
   OR LOWER(REPLACE(name, ' ', '')) = 'durbanpoison'
   OR slug = 'durban-poison';

-- Forbidden Fruit
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/forbidden-fruit_Zm9yYmlkZGVuLWZydWl0.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'forbidden-fruit'
   OR LOWER(REPLACE(name, ' ', '')) = 'forbiddenfruit'
   OR slug = 'forbidden-fruit';

-- Gelato
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/gelato_Z2VsYXRv.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'gelato'
   OR LOWER(REPLACE(name, ' ', '')) = 'gelato'
   OR slug = 'gelato';

-- Gelato 41
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/gelato-41_Z2VsYXRvLTQx.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'gelato-41'
   OR LOWER(REPLACE(name, ' ', '')) = 'gelato41'
   OR slug = 'gelato-41';

-- Girl Scout Cookies
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/girl-scout-cookies_Z2lybC1zY291dC1jb29raWVz.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'girl-scout-cookies'
   OR LOWER(REPLACE(name, ' ', '')) = 'girlscoutcookies'
   OR slug = 'girl-scout-cookies';

-- Gorilla Glue
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/gorilla-glue_Z29yaWxsYS1nbHVl.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'gorilla-glue'
   OR LOWER(REPLACE(name, ' ', '')) = 'gorillaglue'
   OR slug = 'gorilla-glue';

-- Gorilla Zkittlez
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/gorilla-zkittlez_Z29yaWxsYS16a2l0dGxleg==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'gorilla-zkittlez'
   OR LOWER(REPLACE(name, ' ', '')) = 'gorillazkittlez'
   OR slug = 'gorilla-zkittlez';

-- Granddaddy Purple
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/granddaddy-purple_Z3JhbmRkYWRkeS1wdXJwbGU=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'granddaddy-purple'
   OR LOWER(REPLACE(name, ' ', '')) = 'granddaddypurple'
   OR slug = 'granddaddy-purple';

-- Green Crack
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/green-crack_Z3JlZW4tY3JhY2s=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'green-crack'
   OR LOWER(REPLACE(name, ' ', '')) = 'greencrack'
   OR slug = 'green-crack';

-- Ice Cream Cake
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/ice-cream-cake_aWNlLWNyZWFtLWNha2U=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'ice-cream-cake'
   OR LOWER(REPLACE(name, ' ', '')) = 'icecreamcake'
   OR slug = 'ice-cream-cake';

-- Jack Herer
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/jack-herer_amFjay1oZXJlcg==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'jack-herer'
   OR LOWER(REPLACE(name, ' ', '')) = 'jackherer'
   OR slug = 'jack-herer';

-- Lemon Haze
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/lemon-haze_bGVtb24taGF6ZQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'lemon-haze'
   OR LOWER(REPLACE(name, ' ', '')) = 'lemonhaze'
   OR slug = 'lemon-haze';

-- Mac1
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/mac1_bWFjMQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'mac1'
   OR LOWER(REPLACE(name, ' ', '')) = 'mac1'
   OR slug = 'mac1';

-- Mimosa
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/mimosa_bWltb3Nh.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'mimosa'
   OR LOWER(REPLACE(name, ' ', '')) = 'mimosa'
   OR slug = 'mimosa';

-- Northern Lights
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/northern-lights_bm9ydGhlcm4tbGlnaHRz.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'northern-lights'
   OR LOWER(REPLACE(name, ' ', '')) = 'northernlights'
   OR slug = 'northern-lights';

-- Og Kush
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/og-kush_b2cta3VzaA==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'og-kush'
   OR LOWER(REPLACE(name, ' ', '')) = 'ogkush'
   OR slug = 'og-kush';

-- Pineapple Express
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/pineapple-express_cGluZWFwcGxlLWV4cHJlc3M=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'pineapple-express'
   OR LOWER(REPLACE(name, ' ', '')) = 'pineappleexpress'
   OR slug = 'pineapple-express';

-- Purple Haze
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/purple-haze_cHVycGxlLWhhemU=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'purple-haze'
   OR LOWER(REPLACE(name, ' ', '')) = 'purplehaze'
   OR slug = 'purple-haze';

-- Runtz
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/runtz_cnVudHo=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'runtz'
   OR LOWER(REPLACE(name, ' ', '')) = 'runtz'
   OR slug = 'runtz';

-- Skywalker Og
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/skywalker-og_c2t5d2Fsa2VyLW9n.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'skywalker-og'
   OR LOWER(REPLACE(name, ' ', '')) = 'skywalkerog'
   OR slug = 'skywalker-og';

-- Sour Diesel
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/sour-diesel_c291ci1kaWVzZWw=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'sour-diesel'
   OR LOWER(REPLACE(name, ' ', '')) = 'sourdiesel'
   OR slug = 'sour-diesel';

-- Strawberry Cough
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/strawberry-cough_c3RyYXdiZXJyeS1jb3VnaA==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'strawberry-cough'
   OR LOWER(REPLACE(name, ' ', '')) = 'strawberrycough'
   OR slug = 'strawberry-cough';

-- Super Lemon Haze
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/super-lemon-haze_c3VwZXItbGVtb24taGF6ZQ==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'super-lemon-haze'
   OR LOWER(REPLACE(name, ' ', '')) = 'superlemonhaze'
   OR slug = 'super-lemon-haze';

-- Super Silver Haze
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/super-silver-haze_c3VwZXItc2lsdmVyLWhhemU=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'super-silver-haze'
   OR LOWER(REPLACE(name, ' ', '')) = 'supersilverhaze'
   OR slug = 'super-silver-haze';

-- Tangie
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/tangie_dGFuZ2ll.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'tangie'
   OR LOWER(REPLACE(name, ' ', '')) = 'tangie'
   OR slug = 'tangie';

-- Trainwreck
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/trainwreck_dHJhaW53cmVjaw==.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'trainwreck'
   OR LOWER(REPLACE(name, ' ', '')) = 'trainwreck'
   OR slug = 'trainwreck';

-- Wedding Cake
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/wedding-cake_d2VkZGluZy1jYWtl.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'wedding-cake'
   OR LOWER(REPLACE(name, ' ', '')) = 'weddingcake'
   OR slug = 'wedding-cake';

-- White Widow
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/white-widow_d2hpdGUtd2lkb3c=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'white-widow'
   OR LOWER(REPLACE(name, ' ', '')) = 'whitewidow'
   OR slug = 'white-widow';

-- Zkittlez
UPDATE "Strain"
SET image = 'https://cfls.b-cdn.net/strains/zkittlez_emtpdHRsZXo=.png'
WHERE LOWER(REPLACE(name, ' ', '-')) = 'zkittlez'
   OR LOWER(REPLACE(name, ' ', '')) = 'zkittlez'
   OR slug = 'zkittlez';

-- ========================================
-- EXECUTION SUMMARY
-- ========================================
-- Total manufacturers updated: 37
-- Total strains updated: 40
-- Total database updates: 77
-- ========================================
