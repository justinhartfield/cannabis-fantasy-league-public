# Prediction Streak Bug - Root Cause and Fix

## Root Cause Identified

The prediction scoring system queries `*DailyStats` tables (e.g., `cannabisStrainDailyStats`) for `totalPoints`, but these tables **always have `totalPoints = 0`**.

### Evidence:

**File:** `server/services/dataSyncService.ts` (Line 798)
```typescript
await db.insert(cannabisStrainDailyStats)
  .values({
    cannabisStrainId: strain.id,
    statDate,
    totalFavorites: favorites,
    pharmacyCount,
    productCount: pharmacyCount,
    avgPriceCents: 1000,
    priceChange: Math.floor(Math.random() * 6) - 3,
    marketPenetration: Math.min(100, pharmacyCount * 2),
    totalPoints: 0,  // ← ALWAYS ZERO!
  })
```

### Why This Causes All Picks to Show as Incorrect:

1. All entities have `totalPoints = 0`
2. All matchups score as 0-0 ties
3. Line 523 in `predictionService.ts`: `entityAPoints > entityBPoints ? entityAId : entityBId`
4. When both are 0, Entity B always wins (since 0 is NOT > 0)
5. Anyone who picked Entity A loses automatically

## The Fix

### Option 1: Use Daily Challenge Stats (Recommended)
The `*DailyChallengeStats` tables have actual calculated points. Change the prediction scoring to query these tables instead.

**Pros:**
- Uses real calculated points
- Minimal code changes
- Leverages existing scoring engine

**Cons:**
- Daily challenge stats might not exist for all entities
- Requires matchup generation to also use daily challenge stats

### Option 2: Calculate Points On-The-Fly
Calculate points from raw stats data (favorites, pharmacy count, etc.) during scoring.

**Pros:**
- Works with existing data
- No dependency on daily challenge system
- Can use simpler scoring formula

**Cons:**
- Duplicates scoring logic
- Performance impact

### Option 3: Fix Data Sync to Calculate totalPoints
Update `dataSyncService.ts` to calculate and store `totalPoints` when syncing daily stats.

**Pros:**
- Fixes the root cause
- Future-proof
- Consistent with expected behavior

**Cons:**
- Requires defining scoring formula for daily stats
- Need to backfill historical data

## Recommended Implementation: Option 2 (Quick Fix)

Calculate points on-the-fly using a simple formula based on available stats:

### For Cannabis Strains:
```typescript
const points = (totalFavorites * 2) + (pharmacyCount * 5) + (marketPenetration * 1);
```

### For Manufacturers:
```typescript
const points = (salesVolumeGrams / 10) + (productCount * 3) + (marketShareRank <= 10 ? (11 - marketShareRank) * 5 : 0);
```

### For Pharmacies:
```typescript
const points = (orderCount * 2) + (revenueCents / 1000) + (customerRating * 10);
```

### For Brands:
```typescript
const points = (favorites * 2) + (views / 10) + (comments * 5) + (affiliateClicks * 3);
```

This ensures matchups have real score differences and winners are determined correctly.
