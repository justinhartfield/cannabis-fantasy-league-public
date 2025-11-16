# Products Table Implementation Summary

## Overview
Added support for tracking individual cannabis product SKUs (like "Pedanios 26/1 EHD-CA", "DEMECAN TYP 1") in the Cannabis Fantasy League application.

## Changes Made

### 1. Database Schema Updates
**File: `drizzle/schema.ts`**
- Added `products` table with fields:
  - `id`, `name`, `slug`
  - `manufacturerId`, `brandId`, `strainId` (foreign keys)
  - `thcPercentage`, `cbdPercentage`, `productCode`
  - `imageUrl`, `description`
  - `createdAt`, `updatedAt`

- Added `productDailyStats` table with fields:
  - `id`, `productId`, `statDate`
  - `salesVolumeGrams`, `orderCount`, `revenueCents`
  - `totalPoints`
  - `createdAt`, `updatedAt`

### 2. Database Migration
**File: `migrate-products.sql`**
- Standalone migration script to create products tables
- Uses `CREATE TABLE IF NOT EXISTS` for safety
- Creates indexes on `products.name` and `productDailyStats.statDate`
- Marks migration as applied in `__drizzle_migrations` table

**File: `drizzle/0002_yielding_colossus.sql`**
- Generated migration file from Drizzle Kit

### 3. Sync Script Updates
**File: `scripts/sync-daily-stats-complete.ts`**
- Updated to use correct Metabase cards:
  - Card 1278: Brand indv today (for brands)
  - Card 1269: Top Products Today (for products)
- Added `syncProducts()` function that:
  - Fetches product data from Metabase Card 1269
  - Auto-creates product records if they don't exist
  - Syncs daily stats (salesVolumeGrams, orderCount, revenueCents, totalPoints)
  - Uses upsert pattern to handle existing records

## Metabase Integration

### Card Mapping
| Entity Type | Card ID | Card Name | Data Returned |
|------------|---------|-----------|---------------|
| Manufacturers | 1273 | Top Manufacturers Today | Manufacturer names, grams sold |
| Brands | 1278 | Brand indv today | Brand names, grams sold |
| Strains | 1275 | Top Strains Sold Today | Strain names, grams sold |
| Pharmacies | 1276 | Top Pharmacies Today | Pharmacy names, orders, revenue |
| Products | 1269 | Top Products Today | Product SKU names, grams sold |

### Data Flow
1. Metabase Card 1269 returns top-selling product SKUs
2. Sync script checks if product exists in database
3. If not exists, creates new product record with auto-generated slug
4. Syncs daily stats with sales volume, orders, revenue
5. Calculates points: `totalPoints = salesVolumeGrams / 10`

## Deployment Instructions

### Step 1: Run Migration
```bash
cd ~/project/src
git pull origin main

PGPASSWORD="dNLH1zYnvPJ8HjMZxUvmZ0YBZ6CNv27d" psql \
  -h dpg-ct6u8qm8ii6s73a5jrn0-a.oregon-postgres.render.com \
  -U cannabis_fantasy_league_user \
  -d cannabis_fantasy_league \
  -f migrate-products.sql
```

### Step 2: Run Sync Script
```bash
npx tsx scripts/sync-daily-stats-complete.ts
```

### Step 3: Verify Data
```sql
-- Check products created
SELECT COUNT(*) FROM products;

-- Check product daily stats
SELECT p.name, pds.salesVolumeGrams, pds.totalPoints 
FROM products p
JOIN "productDailyStats" pds ON p.id = pds."productId"
WHERE pds."statDate" = CURRENT_DATE
ORDER BY pds.totalPoints DESC
LIMIT 10;
```

## Expected Results

Based on Metabase data:
- **65 products** will be synced daily
- Products auto-created on first sync
- Daily stats track sales volume, orders, revenue, and points
- Points calculated as: grams sold / 10

## Product vs Brand Distinction

- **Brands** (Card 1278): Brand names like "DEMECAN", "Barney's Farm"
  - Stored in `brands` table
  - Synced to `brandDailyStats`

- **Products** (Card 1269): Individual SKUs like "DEMECAN TYP 1", "Pedanios 26/1 EHD-CA"
  - Stored in `products` table
  - Synced to `productDailyStats`
  - Can optionally link to brands via `brandId` foreign key

## Next Steps (Optional)

1. Add product images to Bunny.net CDN
2. Display products in frontend components (Draft Board, Game Leaders)
3. Link products to manufacturers/brands/strains via foreign keys
4. Add product selection to Pick Em game mode
5. Create product leaderboards and rankings

## Files Modified

- `drizzle/schema.ts` - Added products and productDailyStats tables
- `scripts/sync-daily-stats-complete.ts` - Added product sync logic
- `migrate-products.sql` - Standalone migration script
- `drizzle/0002_yielding_colossus.sql` - Generated migration

## Commit Hash
- Latest commit: `07e7ac9` - "Add standalone migration script for products tables"
