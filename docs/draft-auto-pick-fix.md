# Draft Auto-Pick Timer Fix

## Issue Description

When the draft timer reached 0:00, the system was not automatically selecting a player for the user. The timer would expire but no auto-pick would occur, leaving the draft in a stuck state.

## Root Cause Analysis

After investigating the codebase, I identified two main issues:

### 1. Missing Timer Restart After Auto-Pick

**Location:** `server/draftTimer.ts` - `handleTimeExpired()` method

**Problem:** After an auto-pick was successfully completed, the timer for the next pick was never started. The code had a comment stating "Timer for next pick will be started by the makeDraftPick mutation", but `makeAutoPick()` doesn't trigger that mutation - it directly manipulates the database and advances the draft.

**Impact:** The draft would get stuck after the first auto-pick because no subsequent timer would be initiated.

### 2. Incomplete Auto-Pick Logic

**Location:** `server/autoPick.ts`

**Problems:**
- The "brand" position type was not included in the auto-pick logic, even though it's part of the 10-player roster structure
- The ranking logic for selecting the "best available" player was suboptimal - most positions were sorted alphabetically by name rather than by meaningful performance metrics

**Impact:** Auto-picks would not properly fill brand positions and would select players based on alphabetical order rather than actual value.

## Changes Made

### 1. Fixed Timer Restart Logic (`server/draftTimer.ts`)

**Before:**
```typescript
await makeAutoPick(leagueId, teamId);

// Notify all clients
wsManager.notifyAutoPick(leagueId, {
  teamId,
  pickNumber: this.timers.get(leagueId)?.pickNumber || 0,
});

// Timer for next pick will be started by the makeDraftPick mutation
```

**After:**
```typescript
await makeAutoPick(leagueId, teamId);

// Check if draft is complete
const db = await getDb();
if (!db) throw new Error("Database not available");

const [league] = await db
  .select()
  .from(leagues)
  .where(eq(leagues.id, leagueId))
  .limit(1);

// Start timer for next pick if draft is not complete
if (league && !league.draftCompleted) {
  await this.startTimer(leagueId);
}
```

**Explanation:** Now after an auto-pick completes, the system checks if the draft is still ongoing and automatically starts the timer for the next pick. This ensures continuous auto-picking when multiple users fail to make their selections in time.

### 2. Enhanced Auto-Pick Selection Logic (`server/autoPick.ts`)

#### Added Brand Support

**Added to imports:**
```typescript
import { brands, leagues } from "../drizzle/schema";
```

**Added to position counts:**
```typescript
const positionCounts = {
  manufacturer: 0,
  cannabis_strain: 0,
  product: 0,
  pharmacy: 0,
  brand: 0,  // NEW
};
```

**Added brand selection logic:**
```typescript
} else if (targetPosition === "brand") {
  const available = await db
    .select()
    .from(brands)
    .where(draftedIds.length > 0 ? notInArray(brands.id, draftedIds) : undefined)
    .orderBy(sql`${brands.totalFavorites} DESC, ${brands.affiliateClicks} DESC`)
    .limit(1);

  if (available.length > 0) {
    pickedAsset = { id: available[0].id, name: available[0].name };
  }
}
```

#### Improved Ranking Logic

**Cannabis Strains - Before:**
```typescript
.orderBy(cannabisStrains.name)
```

**Cannabis Strains - After:**
```typescript
.orderBy(sql`${cannabisStrains.productCount} DESC, ${cannabisStrains.totalPoints} DESC`)
```

**Products - Before:**
```typescript
.orderBy(strains.name)
```

**Products - After:**
```typescript
.orderBy(sql`${strains.productCount} DESC`)
```

**Pharmacies - Before:**
```typescript
.orderBy(pharmacies.name)
```

**Pharmacies - After:**
```typescript
.orderBy(sql`${pharmacies.productCount} DESC, ${pharmacies.weeklyRevenueCents} DESC`)
```

**Brands - New:**
```typescript
.orderBy(sql`${brands.totalFavorites} DESC, ${brands.affiliateClicks} DESC`)
```

**Explanation:** The system now selects the "next highest position player" based on meaningful performance metrics:
- **Manufacturers:** Product count (already implemented)
- **Cannabis Strains:** Product count and total points
- **Products:** Product count
- **Pharmacies:** Product count and weekly revenue
- **Brands:** Total favorites and affiliate clicks

## Testing Recommendations

1. **Test Auto-Pick Flow:**
   - Start a draft with multiple teams
   - Let the timer expire on a pick
   - Verify that a player is automatically selected
   - Verify that the timer starts for the next pick
   - Let multiple consecutive picks time out to ensure continuous auto-picking

2. **Test Position Priority:**
   - Create a team with uneven position distribution
   - Let auto-pick select players
   - Verify it fills the most needed positions first

3. **Test Brand Auto-Pick:**
   - Create a scenario where the brand position is the most needed
   - Let auto-pick run
   - Verify a brand is selected

4. **Test Ranking Logic:**
   - Review the auto-picked players
   - Verify they are high-value players based on the ranking criteria
   - Compare with manual draft selections

## Files Modified

1. `server/draftTimer.ts` - Fixed timer restart logic
2. `server/autoPick.ts` - Enhanced auto-pick selection with brand support and better rankings

## Deployment Notes

- No database migrations required
- No breaking changes to API or WebSocket messages
- Changes are backward compatible
- Server restart required to apply changes
