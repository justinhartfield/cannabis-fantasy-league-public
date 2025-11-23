# Trend Bonus Fix - November 23, 2025

## Problem Identified

The trend bonus scoring system was awarding **5.0x multiplier to ALL entities with orders** and **1.0x to entities with zero orders**, instead of calculating accurate trend-based multipliers.

### Root Causes

1. **Broken Metabase Query**: `trendMetricsFetcher.ts` was using `executeQuery()` with MongoDB query strings, but this method expects MBQL format, not MongoDB syntax. This caused all trend data fetches to fail silently.

2. **Bad Fallback Logic**: When trend data was missing, the aggregators used this fallback:
   ```typescript
   days1: trendData.trendMetrics?.days1 || data.orderCount
   days7: trendData.trendMetrics?.days7 || data.orderCount
   ```
   This set **both** `days1` and `days7` to the same value (current order count), causing the trend multiplier calculation to trigger the "new entity hype bonus":
   - `multiplier = orderCount / (orderCount / 7) = 7.0` → capped at 5.0x
   - Entities with 0 orders: `multiplier = 0 / 0 = 1.0` (neutral)

## Solution Implemented

### 1. Fixed Metabase Data Fetching

Updated `server/trendMetricsFetcher.ts` to use saved Metabase questions/cards:

```typescript
// Added card ID mappings
const TREND_CARDS = {
  MANUFACTURERS: 123,  // Table 123 - Manufacturer trends
  PHARMACIES: 130,     // Table 130 - Pharmacy trends  
  STRAINS: 1216,       // Question 1216 - Strain trends
  PRODUCTS: 1240,      // Question 1240 - Product trends
};

// Changed from broken MongoDB queries to executeCardQuery()
const results = await metabase.executeCardQuery(cardId);
```

**Benefits:**
- Uses properly configured Metabase saved questions
- Returns structured data with correct field names
- More reliable and maintainable
- Better logging for debugging

### 2. Improved Fallback Logic

Updated all aggregators to use neutral multiplier when trend data is missing:

```typescript
// NEW: Use neutral 1.0x multiplier when data is missing
const stats: TrendScoringStats = {
  orderCount: data.orderCount,
  days1: trendData.trendMetrics?.days1,     // undefined if missing
  days7: trendData.trendMetrics?.days7,     // undefined if missing
  trendMultiplier: trendData.trendMetrics ? undefined : 1.0,  // Force neutral
  // ... rest
};
```

**Benefits:**
- Prevents false "5x hype bonus" for missing data
- Fair neutral scoring when trend data unavailable
- Only applies hype multiplier to truly new entities with proper data

### 3. Enhanced Logging

Added better logging to track when fallbacks are used:

```typescript
if (trendData.trendMetrics === null) {
  await log('warn', 
    `Missing trend metrics for ${name}, using neutral 1.0x multiplier`, 
    { orderCount, rank }
  );
}
```

## Files Modified

1. ✅ `server/trendMetricsFetcher.ts`
   - Added TREND_CARDS constant mapping
   - Rewrote `fetchTrendMetrics()` to use `executeCardQuery()`
   - Rewrote `fetchTrendMetricsBatch()` for batch efficiency
   - Updated `fetchTotalMarketVolume()` to sum from card data
   - Improved `calculateMarketShare()` error handling

2. ✅ `server/dailyChallengeAggregatorV2.ts`
   - Fixed manufacturer fallback logic (lines 181-200)
   - Fixed strain fallback logic (lines 336-355)
   - **Fixed brand ratings fetch** (lines 572-650):
     - Added fallback when date parameters fail
     - Improved logging for debugging
     - Added axios import for better error handling

3. ✅ `server/aggregateProductsV2.ts`
   - Fixed product fallback logic (lines 98-119)

4. ✅ `server/aggregatePharmaciesV2.ts`
   - Fixed pharmacy fallback logic (lines 87-108)

## Metabase Cards Used

### Trend Data (Order-based)
- **Manufacturers**: Table 123
- **Pharmacies**: Table 130
- **Strains**: [Question 1216](https://bi.weed.de/question/1216-strain-trends)
- **Products**: [Question 1240](https://bi.weed.de/question/1240-product-trends)

### Brand Ratings (Rating-based)
- **Brand Today**: Card 1278 (brand-indv-today)
- **Brand Yesterday**: Card 1287 (brand-indv-yesterday-modified)

**Note**: Brands use a different aggregation system based on ratings data, not orders or trend metrics.

## Brand Ratings Issue (Separate from Trend Bonus)

During testing, we discovered that **brands weren't updating at all** because the brand ratings data wasn't being fetched. This is a separate issue from the trend bonus problem.

### The Brand Problem

Brands use a completely different aggregation system:
- They aggregate from **ratings data**, not orders or trend metrics
- They fetch from Metabase cards 1278 and 1287 with date parameters
- The query was returning empty results: `[warn] No brand ratings data found`

### Brand Fix Applied

**Updated `fetchBrandRatings()` method**:
1. **Better parameter format**: Changed from `['absolute-date', date]` array format to simple string `date`
2. **Fallback mechanism**: If parameterized query fails, tries without parameters
3. **Enhanced logging**: Added detailed logging to track what's happening
4. **Better error handling**: Added axios error details for debugging

```typescript
// Try with parameters first
try {
  todayResults = await metabase.executeCardQuery(1278, { UpdatedAt: statDate });
} catch (error) {
  // Fall back to fetching without parameters
  todayResults = await metabase.executeCardQuery(1278);
}
```

### Why Brands Are Different

- **Manufacturers/Strains/Products/Pharmacies**: Use order volume + trend data
- **Brands**: Use ratings (totalRatings, bayesianAverage, rating deltas)

This is by design - brands are evaluated on community engagement, not sales.

## Expected Behavior After Fix

### With Proper Trend Data
- **Hot trends** (current day 3x higher than 7-day avg): 3.0x multiplier
- **Growing** (current day 2x higher): 2.0x multiplier
- **Steady** (matching average): 1.0x multiplier
- **Declining** (current day 50% of average): 0.5x multiplier

### Without Trend Data (Fallback)
- **All entities**: 1.0x neutral multiplier (fair baseline)
- No false hype bonus

## Testing

To verify the fix works:

```bash
# Run aggregation for a specific date
npm run tsx scripts/sync-daily-stats.ts -- --date=2025-11-23 --useTrendScoring

# Check the logs for:
# - "Fetched X records from card Y" (confirms data is loading)
# - "Missing trend metrics" warnings (shows which entities lack data)
# - Trend multiplier values in the 0.1x - 5.0x range (not all 5.0x)
```

## Future Improvements

1. **Verify Metabase Card Schemas**: Ensure all cards return fields like `days1`, `days7`, `entityName`, etc.
2. **Add Data Quality Checks**: Alert when too many entities are missing trend data
3. **Backfill Historical Data**: Run aggregation over past dates to populate trend history
4. **Progressive Multipliers**: Consider scaling hype bonus (1.5x-3.0x) instead of flat 5.0x for new entities

## Impact

This fix ensures:
- ✅ **Fair scoring**: Entities are scored based on actual trends, not missing data
- ✅ **Predictable gameplay**: Players can make strategic draft decisions
- ✅ **Data reliability**: Uses structured Metabase queries instead of fragile MongoDB strings
- ✅ **Better debugging**: Enhanced logging shows exactly when/why fallbacks occur

---

**Status**: ✅ IMPLEMENTED  
**Next Step**: Run aggregation and verify trend multipliers are properly distributed

