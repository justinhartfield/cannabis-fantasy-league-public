# Challenge Page Performance Analysis

## Current Performance Issues

### 1. **Initial Page Load is Slow**

**Root Causes:**
- Multiple sequential database queries on page load
- Fetching league data, team data, scores, and breakdowns separately
- No caching mechanism for frequently accessed data

**Affected Code:**
- `client/src/pages/DailyChallenge.tsx` - Multiple `useQuery` hooks
- `server/scoringRouter.ts` - `getChallengeDayScores` and `getChallengeDayBreakdown`

### 2. **"UPDATE SCORES NOW" Button Takes Very Long**

**Root Causes:**
- **Metabase Query Execution**: Fetches ALL orders from Metabase (Card 1266) then filters client-side
- **Daily Stats Aggregation**: Processes all manufacturers, strains, products, pharmacies, and brands sequentially
- **Score Calculation**: Recalculates scores for each team from scratch
- **No Incremental Updates**: Every update requires full data fetch and recalculation

**Performance Bottlenecks (in order of impact):**

1. **Metabase Data Fetch** (`dailyChallengeAggregator.ts:159`)
   - Fetches entire dataset from Metabase Card 1266
   - Filters data client-side by date
   - This is the BIGGEST bottleneck

2. **Parallel Aggregation** (`dailyChallengeAggregator.ts:128-134`)
   - Processes 5 entity types in parallel (good!)
   - But each aggregation involves multiple DB operations

3. **Sequential Team Score Calculation** (`scoringEngine.ts:963-970`)
   - Processes teams one by one (not parallelized)
   - Each team requires multiple DB queries for lineup and stats

## Performance Optimization Strategies

### High Impact (Implement First)

#### 1. **Cache Scores in Frontend**
- Store calculated scores in React state/context
- Only refetch when explicitly needed
- Show cached scores immediately on page load

#### 2. **Optimize Metabase Query**
- Create a date-filtered Metabase card specifically for daily challenges
- Pass date parameter to Metabase query instead of fetching all and filtering
- This alone could reduce query time by 80-90%

#### 3. **Add Score Caching in Backend**
- Cache calculated scores in Redis or in-memory
- Set TTL (e.g., 5 minutes for active challenges)
- Return cached scores if available and recent

#### 4. **Background Score Updates**
- Use a scheduled job (cron) to update scores every hour
- Users see pre-calculated scores instantly
- "UPDATE SCORES NOW" button only available to admins or with rate limiting

### Medium Impact

#### 5. **Parallelize Team Score Calculations**
- Calculate scores for both teams in parallel using `Promise.all()`
- Currently sequential in `calculateDailyChallengeScores`

#### 6. **Optimize Database Queries**
- Add composite indexes on frequently queried fields
- Use `SELECT` only needed fields instead of `SELECT *`
- Batch related queries together

#### 7. **Incremental Aggregation**
- Only aggregate new/changed data since last update
- Store "last aggregated" timestamp
- Skip aggregation if data hasn't changed

### Low Impact (Nice to Have)

#### 8. **Lazy Load Breakdown Details**
- Load team scores first (fast)
- Load detailed breakdowns on demand when user clicks a team
- This is already partially implemented

#### 9. **Add Loading States with Skeleton UI**
- Show skeleton loaders while data is loading
- Perceived performance improvement

#### 10. **WebSocket Real-time Updates**
- Already implemented for score updates
- Ensure it's being used effectively

## Recommended Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. Fix the score display bug (DONE ✓)
2. Add frontend score caching
3. Parallelize team score calculations

### Phase 2: Major Performance Boost (3-4 hours)
4. Create date-filtered Metabase card
5. Optimize Metabase query to use date parameter
6. Add backend score caching (Redis or in-memory)

### Phase 3: Long-term Solution (4-6 hours)
7. Implement scheduled background score updates
8. Add incremental aggregation
9. Optimize database queries and add indexes

## Expected Performance Improvements

| Optimization | Current Time | Expected Time | Improvement |
|--------------|--------------|---------------|-------------|
| Initial Page Load | 3-5s | 0.5-1s | 80% faster |
| Update Scores (with Metabase optimization) | 15-30s | 3-5s | 85% faster |
| Update Scores (with caching) | 15-30s | <1s | 95% faster |
| Update Scores (with background jobs) | 15-30s | Instant | 100% faster |

## Code Changes Required

### 1. Frontend Caching (DailyChallenge.tsx)
```typescript
// Add score caching
const [cachedScores, setCachedScores] = useState<TeamScore[]>([]);

useEffect(() => {
  if (dayScores) {
    setCachedScores(dayScores);
  }
}, [dayScores]);

// Use cached scores for display
const displayScores = dayScores || cachedScores;
```

### 2. Parallelize Team Calculations (scoringEngine.ts)
```typescript
// Replace sequential loop with parallel execution
await Promise.all(
  challengeTeams.map(team => 
    calculateTeamDailyScore(team.id, challengeId, statDateString)
  )
);
```

### 3. Optimize Metabase Query (dailyChallengeAggregator.ts)
```typescript
// Create new Metabase card with date parameter
// Or modify existing query to filter server-side
const orders = await this.metabase.executeCardQuery(NEW_CARD_ID, {
  date: dateString
});
```

### 4. Add Backend Caching (scoringRouter.ts)
```typescript
// Add simple in-memory cache
const scoreCache = new Map<string, { scores: any[], timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check cache before querying
const cacheKey = `${challengeId}-${statDate}`;
const cached = scoreCache.get(cacheKey);
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  return cached.scores;
}
```

## Monitoring and Metrics

Add performance logging to track:
- Metabase query execution time
- Aggregation time per entity type
- Score calculation time per team
- Total update time

This will help identify bottlenecks and measure improvement.
