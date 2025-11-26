// ========================================
// COMPLETE DATABASE UPDATES
// Cannabis Fantasy League - Image Assets
// ========================================
// Generated: 2025-11-26
// Manufacturers: 37 logos
// Strains: 40 images
// ========================================

// MANUFACTURER LOGO UPDATES
// ========================================

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("cannasseur[ -]club", "i") } },
    { slug: "cannasseur-club" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/cannasseur-club_Y2FubmFzc2V1ci1jbHVi.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("drapalin", "i") } },
    { slug: "drapalin" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/drapalin_ZHJhcGFsaW4=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("dutch[ -]passion", "i") } },
    { slug: "dutch-passion" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/dutch-passion_ZHV0Y2gtcGFzc2lvbg==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("easyhomegrowing", "i") } },
    { slug: "easyhomegrowing" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/easyhomegrowing_ZWFzeWhvbWVncm93aW5n.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("enua", "i") } },
    { slug: "enua" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/enua_ZW51YQ==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("focus[ -]v", "i") } },
    { slug: "focus-v" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/focus-v_Zm9jdXMtdg==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("g13[ -]labs", "i") } },
    { slug: "g13-labs" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/g13-labs_ZzEzLWxhYnM=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("green[ -]house[ -]seed[ -]co", "i") } },
    { slug: "green-house-seed-co" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/green-house-seed-co_Z3JlZW4taG91c2Utc2VlZC1jbw==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("grove[ -]bags", "i") } },
    { slug: "grove-bags" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/grove-bags_Z3JvdmUtYmFncw==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("hanf[ -]im[ -]gluck", "i") } },
    { slug: "hanf-im-gluck" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/hanf-im-gluck_aGFuZi1pbS1nbHVjaw==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("hazefly", "i") } },
    { slug: "hazefly" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/hazefly_aGF6ZWZseQ==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("hempcrew", "i") } },
    { slug: "hempcrew" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/hempcrew_aGVtcGNyZXc=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("hemper", "i") } },
    { slug: "hemper" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/hemper_aGVtcGVy.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("kailar", "i") } },
    { slug: "kailar" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/kailar_a2FpbGFy.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("luvo", "i") } },
    { slug: "luvo" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/luvo_bHV2bw==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("malantis", "i") } },
    { slug: "malantis" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/malantis_bWFsYW50aXM=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("mediprocan", "i") } },
    { slug: "mediprocan" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/mediprocan_bWVkaXByb2Nhbg==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("nevernot", "i") } },
    { slug: "nevernot" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/nevernot_bmV2ZXJub3Q=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("noids", "i") } },
    { slug: "noids" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/noids_bm9pZHM=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("original[ -]kavatza", "i") } },
    { slug: "original-kavatza" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/original-kavatza_b3JpZ2luYWwta2F2YXR6YQ==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("pax", "i") } },
    { slug: "pax" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/pax_cGF4.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("peace[ -]naturals", "i") } },
    { slug: "peace-naturals" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/peace-naturals_cGVhY2UtbmF0dXJhbHM=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("remexian[ -]pharma", "i") } },
    { slug: "remexian-pharma" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/remexian-pharma_cmVtZXhpYW4tcGhhcm1h.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("royal[ -]queen[ -]seeds", "i") } },
    { slug: "royal-queen-seeds" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/royal-queen-seeds_cm95YWwtcXVlZW4tc2VlZHM=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("seedstockers", "i") } },
    { slug: "seedstockers" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/seedstockers_c2VlZHN0b2NrZXJz.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("skunky[ -]monkey", "i") } },
    { slug: "skunky-monkey" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/skunky-monkey_c2t1bmt5LW1vbmtleQ==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("smoking", "i") } },
    { slug: "smoking" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/smoking_c21va2luZw==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("spliffers", "i") } },
    { slug: "spliffers" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/spliffers_c3BsaWZmZXJz.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("storz[ -]bickel", "i") } },
    { slug: "storz-bickel" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/storz-bickel_c3RvcnotYmlja2Vs.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("treez[ -]club", "i") } },
    { slug: "treez-club" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/treez-club_dHJlZXotY2x1Yg==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("treez[ -]tools", "i") } },
    { slug: "treez-tools" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/treez-tools_dHJlZXotdG9vbHM=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("tyson[ -]2[ -]0", "i") } },
    { slug: "tyson-2-0" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/tyson-2-0_dHlzb24tMi0w.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("vapes[ -]n[ -]dabs", "i") } },
    { slug: "vapes-n-dabs" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/vapes-n-dabs_dmFwZXMtbi1kYWJz.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("vayamed", "i") } },
    { slug: "vayamed" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/vayamed_dmF5YW1lZA==.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("vonblute", "i") } },
    { slug: "vonblute" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/vonblute_dm9uYmx1dGU=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("weeco", "i") } },
    { slug: "weeco" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/weeco_d2VlY28=.png" } }
);

db.Manufacturer.updateOne(
  { $or: [
    { name: { $regex: new RegExp("weedo", "i") } },
    { slug: "weedo" }
  ] },
  { $set: { logoUrl: "https://cfls.b-cdn.net/manufacturers/weedo_d2VlZG8=.png" } }
);

// ========================================
// STRAIN IMAGE UPDATES
// ========================================

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("ak[ -]47", "i") } },
    { slug: "ak-47" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/ak-47_YWstNDc=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("amnesia[ -]haze", "i") } },
    { slug: "amnesia-haze" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/amnesia-haze_YW1uZXNpYS1oYXpl.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("blue[ -]dream", "i") } },
    { slug: "blue-dream" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/blue-dream_Ymx1ZS1kcmVhbQ==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("blueberry", "i") } },
    { slug: "blueberry" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/blueberry_Ymx1ZWJlcnJ5.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("bubba[ -]kush", "i") } },
    { slug: "bubba-kush" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/bubba-kush_YnViYmEta3VzaA==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("cereal[ -]milk", "i") } },
    { slug: "cereal-milk" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/cereal-milk_Y2VyZWFsLW1pbGs=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("chemdawg", "i") } },
    { slug: "chemdawg" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/chemdawg_Y2hlbWRhd2c=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("cherry[ -]pie", "i") } },
    { slug: "cherry-pie" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/cherry-pie_Y2hlcnJ5LXBpZQ==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("cookies", "i") } },
    { slug: "cookies" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/cookies_Y29va2llcw==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("critical[ -]kush", "i") } },
    { slug: "critical-kush" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/critical-kush_Y3JpdGljYWwta3VzaA==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("do[ -]si[ -]dos", "i") } },
    { slug: "do-si-dos" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/do-si-dos_ZG8tc2ktZG9z.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("durban[ -]poison", "i") } },
    { slug: "durban-poison" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/durban-poison_ZHVyYmFuLXBvaXNvbg==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("forbidden[ -]fruit", "i") } },
    { slug: "forbidden-fruit" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/forbidden-fruit_Zm9yYmlkZGVuLWZydWl0.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("gelato", "i") } },
    { slug: "gelato" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/gelato_Z2VsYXRv.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("gelato[ -]41", "i") } },
    { slug: "gelato-41" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/gelato-41_Z2VsYXRvLTQx.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("girl[ -]scout[ -]cookies", "i") } },
    { slug: "girl-scout-cookies" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/girl-scout-cookies_Z2lybC1zY291dC1jb29raWVz.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("gorilla[ -]glue", "i") } },
    { slug: "gorilla-glue" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/gorilla-glue_Z29yaWxsYS1nbHVl.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("gorilla[ -]zkittlez", "i") } },
    { slug: "gorilla-zkittlez" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/gorilla-zkittlez_Z29yaWxsYS16a2l0dGxleg==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("granddaddy[ -]purple", "i") } },
    { slug: "granddaddy-purple" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/granddaddy-purple_Z3JhbmRkYWRkeS1wdXJwbGU=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("green[ -]crack", "i") } },
    { slug: "green-crack" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/green-crack_Z3JlZW4tY3JhY2s=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("ice[ -]cream[ -]cake", "i") } },
    { slug: "ice-cream-cake" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/ice-cream-cake_aWNlLWNyZWFtLWNha2U=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("jack[ -]herer", "i") } },
    { slug: "jack-herer" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/jack-herer_amFjay1oZXJlcg==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("lemon[ -]haze", "i") } },
    { slug: "lemon-haze" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/lemon-haze_bGVtb24taGF6ZQ==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("mac1", "i") } },
    { slug: "mac1" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/mac1_bWFjMQ==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("mimosa", "i") } },
    { slug: "mimosa" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/mimosa_bWltb3Nh.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("northern[ -]lights", "i") } },
    { slug: "northern-lights" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/northern-lights_bm9ydGhlcm4tbGlnaHRz.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("og[ -]kush", "i") } },
    { slug: "og-kush" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/og-kush_b2cta3VzaA==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("pineapple[ -]express", "i") } },
    { slug: "pineapple-express" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/pineapple-express_cGluZWFwcGxlLWV4cHJlc3M=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("purple[ -]haze", "i") } },
    { slug: "purple-haze" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/purple-haze_cHVycGxlLWhhemU=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("runtz", "i") } },
    { slug: "runtz" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/runtz_cnVudHo=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("skywalker[ -]og", "i") } },
    { slug: "skywalker-og" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/skywalker-og_c2t5d2Fsa2VyLW9n.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("sour[ -]diesel", "i") } },
    { slug: "sour-diesel" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/sour-diesel_c291ci1kaWVzZWw=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("strawberry[ -]cough", "i") } },
    { slug: "strawberry-cough" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/strawberry-cough_c3RyYXdiZXJyeS1jb3VnaA==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("super[ -]lemon[ -]haze", "i") } },
    { slug: "super-lemon-haze" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/super-lemon-haze_c3VwZXItbGVtb24taGF6ZQ==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("super[ -]silver[ -]haze", "i") } },
    { slug: "super-silver-haze" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/super-silver-haze_c3VwZXItc2lsdmVyLWhhemU=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("tangie", "i") } },
    { slug: "tangie" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/tangie_dGFuZ2ll.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("trainwreck", "i") } },
    { slug: "trainwreck" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/trainwreck_dHJhaW53cmVjaw==.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("wedding[ -]cake", "i") } },
    { slug: "wedding-cake" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/wedding-cake_d2VkZGluZy1jYWtl.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("white[ -]widow", "i") } },
    { slug: "white-widow" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/white-widow_d2hpdGUtd2lkb3c=.png" } }
);

db.Strain.updateOne(
  { $or: [
    { name: { $regex: new RegExp("zkittlez", "i") } },
    { slug: "zkittlez" }
  ] },
  { $set: { image: "https://cfls.b-cdn.net/strains/zkittlez_emtpdHRsZXo=.png" } }
);

// ========================================
// EXECUTION SUMMARY
// ========================================
// Total manufacturers updated: 37
// Total strains updated: 40
// Total database updates: 77
// ========================================
