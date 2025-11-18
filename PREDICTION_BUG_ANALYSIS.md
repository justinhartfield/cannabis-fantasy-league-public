# Prediction Streak Bug Analysis

## Issue
All user predictions are showing as incorrect, even when users believe they made correct picks.

## Root Cause
The bug is in `server/predictionService.ts` in the `scoreMatchup` function (line 515):

```typescript
const winnerId = entityAPoints >= entityBPoints 
  ? matchup.entityAId 
  : matchup.entityBId;
```

### Problem Scenarios:

1. **Missing Stats Data**: When daily stats don't exist for the matchup date, both `entityAPoints` and `entityBPoints` default to 0 (line 445, 467, 489, 511).

2. **Tie Scenario**: When both entities have the same points (including 0-0 ties), the `>=` operator causes Entity A to always win.

3. **Systematic Bias**: This creates a systematic bias where:
   - All ties go to Entity A
   - If stats are missing or not generated, all matchups become 0-0 ties
   - Anyone who picked Entity B loses automatically
   - This explains why ALL picks show as incorrect

## Evidence from Screenshot
The screenshot shows:
- 0% accuracy for yesterday
- All 7 matchups marked with red X (incorrect)
- Winners listed for each matchup
- This pattern suggests systematic scoring failure, not random user error

## Potential Contributing Issues

### Issue 1: Stats May Not Exist
The scoring logic queries for stats with `statDate = matchupDate`:
```typescript
eq(manufacturerDailyStats.statDate, matchup.matchupDate)
```

If daily stats aren't being generated or are delayed, all matchups would score as 0-0 ties.

### Issue 2: Timing Problem
- Matchups generated: 12:00 AM UTC (start of day)
- Scoring runs: 11:00 PM UTC (end of day)
- Stats generation: Unknown timing

If stats for a given date aren't available by 11 PM that same day, scoring will fail.

## Recommended Fixes

### Fix 1: Handle Ties Properly (CRITICAL)
When points are equal, we should either:
- Mark the matchup as a tie and don't mark predictions as correct/incorrect
- Use a tiebreaker (random, entity ID, etc.)
- Skip scoring until stats are available

### Fix 2: Verify Stats Exist Before Scoring
Add validation to ensure stats exist before determining a winner:
```typescript
if (entityAPoints === 0 && entityBPoints === 0) {
  console.warn(`No stats found for matchup ${matchup.id}, skipping scoring`);
  return; // Don't score this matchup yet
}
```

### Fix 3: Better Logging
Add logging to track when stats are missing:
```typescript
if (!statsA[0]) {
  console.warn(`No stats found for entity A (${matchup.entityAName}) on ${matchup.matchupDate}`);
}
```

## Next Steps
1. Implement Fix 1 and Fix 2
2. Add logging to understand stats generation timing
3. Verify stats are being generated daily
4. Test with real data
5. Consider re-scoring historical matchups if data exists
