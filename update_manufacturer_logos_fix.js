// MongoDB update script for manufacturer logo fixes
// Generated: 2025-11-26
// Fixes 8 manufacturers with blue placeholder logos

db.Manufacturer.updateMany({"name": "Peace Naturals"}, {$set: {"logoUrl": "https://cfls.b-cdn.net/manufacturers/peace-naturals_cGVhY2UtbmF0dXJhbHM=.png"}});
db.Manufacturer.updateMany({"name": "enua"}, {$set: {"logoUrl": "https://cfls.b-cdn.net/manufacturers/enua_ZW51YQ==.png"}});
db.Manufacturer.updateMany({"name": "enua Pharma"}, {$set: {"logoUrl": "https://cfls.b-cdn.net/manufacturers/enua_ZW51YQ==.png"}});
db.Manufacturer.updateMany({"name": "Remexian Pharma"}, {$set: {"logoUrl": "https://cfls.b-cdn.net/manufacturers/remexian-pharma_cmVtZXhpYW4tcGhhcm1h.png"}});
db.Manufacturer.updateMany({"name": "Weeco"}, {$set: {"logoUrl": "https://cfls.b-cdn.net/manufacturers/weeco_d2VlY28=.png"}});
db.Manufacturer.updateMany({"name": "luvo"}, {$set: {"logoUrl": "https://cfls.b-cdn.net/manufacturers/luvo_bHV2bw==.png"}});
db.Manufacturer.updateMany({"name": "mediproCan"}, {$set: {"logoUrl": "https://cfls.b-cdn.net/manufacturers/mediprocan_bWVkaXByb2Nhbg==.png"}});
db.Manufacturer.updateMany({"name": "Drapalin"}, {$set: {"logoUrl": "https://cfls.b-cdn.net/manufacturers/drapalin_ZHJhcGFsaW4=.png"}});
db.Manufacturer.updateMany({"name": "Vayamed"}, {$set: {"logoUrl": "https://cfls.b-cdn.net/manufacturers/vayamed_dmF5YW1lZA==.png"}});

print("✅ Updated 8 manufacturer logos");
