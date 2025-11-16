# Performance Improvements Testing Guide

## Overview
This guide provides step-by-step instructions for testing all performance improvements implemented in the `performance-improvements` branch.

---

## Pre-Deployment Testing

### 1. Build and Compile Check

```bash
# Install dependencies
cd /home/ubuntu/cannabis-fantasy-league
pnpm install

# Build the project
pnpm build

# Check for TypeScript errors
pnpm type-check
```

**Expected Result:** No build errors or TypeScript errors

---

## Phase 1: Quick Wins Testing

### Test 1.1: Parallel Team Calculations

**File:** `server/scoringEngine.ts` (line 963-973)

**What Changed:**
- Teams now process in parallel instead of sequentially

**How to Test:**
1. Trigger a score update for a challenge
2. Check server logs for timing

**Expected Logs:**
```
[calculateDailyChallengeScores] Processing team 1 (Justin's Team)
[calculateDailyChallengeScores] Processing team 2 (Tang's Team)
```

**Success Criteria:**
- Both teams start processing at nearly the same time
- Total calculation time is ~50% faster than before

---

### Test 1.2: Frontend Score Caching

**File:** `client/src/pages/DailyChallenge.tsx` (lines 69-88, 279-295, 329-365)

**What Changed:**
- Scores cached in localStorage
- Instant display on page load

**How to Test:**

1. **First Visit (Cache Miss):**
   - Open Challenge page
   - Open browser DevTools → Console
   - Look for: `[ScoreCache] Loaded cached scores from localStorage`
   - Should see empty array or no cached scores

2. **After Scores Load:**
   - Wait for scores to appear
   - Check console: `[ScoreCache] Updated cached scores in localStorage`
   - Check localStorage: DevTools → Application → Local Storage
   - Look for key: `challenge-{id}-scores`

3. **Second Visit (Cache Hit):**
   - Refresh the page
   - Scores should appear INSTANTLY (no loading delay)
   - Check console: `[ScoreCache] Using cached scores for display`

4. **Cache Expiration:**
   - Wait 1 hour
   - Refresh page
   - Cache should be expired and fresh data fetched

**Success Criteria:**
- ✅ First load: Scores fetch from API
- ✅ Subsequent loads: Scores appear instantly from cache
- ✅ Cache updates when new scores arrive
- ✅ Cache expires after 1 hour

---

## Phase 2: Backend Caching Testing

### Test 2.1: In-Memory Cache

**File:** `server/scoringRouter.ts` (lines 9-49, 449-453, 565-567, 137-138)

**What Changed:**
- Server caches scores for 5 minutes
- Subsequent requests return instantly

**How to Test:**

1. **First Request (Cache Miss):**
   - Visit Challenge page
   - Check server logs:
     ```
     [ScoreCache] Cache MISS for 44-2025-11-16
     [Scoring API] getChallengeDayScores - userId: ...
     [ScoreCache] Cached scores for 44-2025-11-16
     ```

2. **Second Request (Cache Hit):**
   - Refresh page within 5 minutes
   - Check server logs:
     ```
     [ScoreCache] Cache HIT for 44-2025-11-16
     ```
   - Response should be instant (<100ms)

3. **Cache Invalidation:**
   - Click "UPDATE SCORES NOW"
   - Check server logs:
     ```
     [ScoreCache] Invalidated cache for 44-2025-11-16
     ```
   - Next request will be a cache miss

4. **Cache Expiration:**
   - Wait 5 minutes
   - Refresh page
   - Should see cache miss (expired)

**Success Criteria:**
- ✅ First request: Cache miss, normal query time
- ✅ Subsequent requests: Cache hit, <100ms response
- ✅ Cache invalidates after score update
- ✅ Cache expires after 5 minutes

---

## Phase 3: Metabase Optimization Testing

### Test 3.1: Date-Filtered Query

**File:** `server/dailyChallengeAggregator.ts` (lines 155-202)
**File:** `server/metabase.ts` (lines 152-159)

**What Changed:**
- Tries date-filtered Metabase card first (Card 1267)
- Falls back to client-side filtering if card doesn't exist

**How to Test:**

**Scenario A: Card 1267 Exists**

1. Create Card 1267 in Metabase (see `METABASE_CARD_SETUP.md`)
2. Trigger score update
3. Check server logs:
   ```
   [DailyChallengeAggregator] Attempting date-filtered Metabase query (Card 1267)...
   [Metabase] Executing card 1267 with parameters... { date: '2025-11-16' }
   [DailyChallengeAggregator] ✓ Date-filtered query returned 150 orders for 2025-11-16
   ```

**Success Criteria:**
- ✅ Query completes in 1-2 seconds (vs 10-15 seconds before)
- ✅ Returns only orders for specified date
- ✅ No client-side filtering needed

**Scenario B: Card 1267 Doesn't Exist (Fallback)**

1. Don't create Card 1267 (or use wrong ID)
2. Trigger score update
3. Check server logs:
   ```
   [DailyChallengeAggregator] Attempting date-filtered Metabase query (Card 1267)...
   [DailyChallengeAggregator] Date-filtered query failed, falling back to client-side filtering
   [Metabase] Executing card 1266...
   [DailyChallengeAggregator] Filtered to 150 orders for 2025-11-16
   ```

**Success Criteria:**
- ✅ Fallback works automatically
- ✅ No errors thrown
- ✅ Correct data returned (slower but functional)

---

## Phase 4: Background Updates Testing

### Test 4.1: Scheduler Running

**File:** `server/challengeScoreScheduler.ts`

**What Changed:**
- UI now clarifies automatic updates

**How to Test:**

1. **Check Scheduler Started:**
   - Start server
   - Check logs:
     ```
     [DailyChallengeScheduler] Challenge score scheduler started
     [ChallengeScoreScheduler] Started - checking every minute
     ```

2. **Health Checks:**
   - Wait 15 minutes
   - Check logs every 15 minutes:
     ```
     [ChallengeScoreScheduler] Health check at 2025-11-16T14:15:00.000Z - Hour: 14, Minute: 15
     ```

3. **Hourly Updates:**
   - Wait until next hour (e.g., 3:00, 4:00)
   - Check logs at :00:
     ```
     [ChallengeScoreScheduler] Triggering hourly update at 2025-11-16T15:00:00.000Z
     [ChallengeScoreScheduler] Found 2 active challenges to update
     [ChallengeScoreScheduler] Updating scores for challenge 44
     [ChallengeScoreScheduler] Updated challenge 44
     [ChallengeScoreScheduler] Hourly score update complete
     ```

4. **WebSocket Updates:**
   - Open Challenge page
   - Wait for hourly update
   - Check browser console:
     ```
     [WebSocket] Received score update: { challengeId: 44, ... }
     ```
   - Scores should update automatically without refresh

**Success Criteria:**
- ✅ Scheduler starts on server startup
- ✅ Health checks every 15 minutes
- ✅ Updates trigger every hour at :00
- ✅ WebSocket pushes updates to clients
- ✅ UI updates automatically

---

### Test 4.2: UI Clarification

**File:** `client/src/pages/DailyChallenge.tsx` (lines 630-632)

**What Changed:**
- Added text: "Scores update automatically every hour"

**How to Test:**

1. Visit active Challenge page
2. Scroll to "Live Updates Connected" section
3. Verify text displays:
   ```
   Live Updates Connected
   Last updated: 3:00:00 PM
   Scores update automatically every hour
   Next update in: 45:23
   ```

**Success Criteria:**
- ✅ Text clearly states automatic updates
- ✅ Users understand they don't need to click update button

---

## Integration Testing

### End-to-End User Flow

**Scenario: New User Visits Challenge**

1. **First Visit:**
   - User opens Challenge page
   - Sees scores instantly (from cache or quick load)
   - Sees "Scores update automatically every hour"
   - Sees "Live Updates Connected"

2. **Waiting:**
   - User leaves page open
   - Hour passes (e.g., 2:00 → 3:00)
   - Scores update automatically via WebSocket
   - "Last updated" time changes
   - No page refresh needed

3. **Return Visit:**
   - User closes and reopens page
   - Scores appear INSTANTLY from cache
   - Fresh data loads in background
   - Cache updates with new data

**Success Criteria:**
- ✅ Instant initial load
- ✅ Automatic updates without user action
- ✅ Cached scores on return visits
- ✅ No manual "UPDATE SCORES NOW" needed

---

## Performance Benchmarks

### Metrics to Measure

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| **Initial Page Load** | 3-5s | 0.5-1s | DevTools Network tab |
| **Cached Page Load** | 3-5s | <100ms | DevTools Network tab |
| **Score Update (with Metabase opt)** | 20-30s | 3-5s | Server logs timing |
| **Repeated Query** | 3-5s | <100ms | Server logs (cache hit) |
| **Metabase Query** | 10-15s | 1-2s | Server logs |

### How to Measure

1. **Initial Page Load:**
   - Clear cache and localStorage
   - Open DevTools → Network tab
   - Visit Challenge page
   - Check "DOMContentLoaded" time

2. **Cached Page Load:**
   - Visit page once
   - Refresh page
   - Check "DOMContentLoaded" time

3. **Score Update:**
   - Click "UPDATE SCORES NOW"
   - Check server logs for total time
   - Look for: `[calculateDailyChallengeScores]` timestamps

4. **Cache Performance:**
   - Make same request twice within 5 minutes
   - Compare response times in server logs

---

## Regression Testing

### Things That Should Still Work

1. **Manual Score Updates:**
   - "UPDATE SCORES NOW" button still works
   - Triggers immediate calculation
   - Invalidates cache

2. **Score Breakdown:**
   - Clicking team shows detailed breakdown
   - All positions display correctly
   - Total matches sum of positions

3. **WebSocket Connection:**
   - Connects on page load
   - Receives updates
   - Reconnects if disconnected

4. **Challenge Finalization:**
   - Challenges finalize at midnight
   - Winner determined correctly
   - Status changes to 'complete'

---

## Troubleshooting

### Issue: Scores Not Caching

**Symptoms:**
- Scores load slowly every time
- No cache logs in console

**Check:**
1. localStorage enabled in browser?
2. Check browser console for errors
3. Verify cache key format: `challenge-{id}-scores`

**Fix:**
- Clear localStorage and try again
- Check browser privacy settings

---

### Issue: Backend Cache Not Working

**Symptoms:**
- Every request shows "Cache MISS"
- No "Cache HIT" logs

**Check:**
1. Server restarted? (Cache is in-memory, clears on restart)
2. Requests within 5 minutes?
3. Same challengeId and statDate?

**Fix:**
- Wait for cache to populate
- Check cache key matches

---

### Issue: Metabase Fallback Always Used

**Symptoms:**
- Always see "falling back to client-side filtering"
- Never see "Date-filtered query returned"

**Check:**
1. Card 1267 created in Metabase?
2. Card has date parameter?
3. API key has access to card?

**Fix:**
- Create Card 1267 (see `METABASE_CARD_SETUP.md`)
- Verify parameter name is exactly "date"
- Check Metabase permissions

---

### Issue: Scheduler Not Running

**Symptoms:**
- No hourly updates
- No health check logs

**Check:**
1. Server started successfully?
2. Check startup logs for scheduler
3. Any errors in logs?

**Fix:**
- Restart server
- Check for errors in `challengeScoreScheduler.ts`

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Build completes successfully
- [ ] Frontend caching works
- [ ] Backend caching works
- [ ] Metabase fallback works (even without Card 1267)
- [ ] Scheduler starts on server startup
- [ ] WebSocket updates work
- [ ] Manual updates still work
- [ ] No regression in existing features
- [ ] Documentation updated
- [ ] Performance metrics improved

---

## Post-Deployment Monitoring

After deploying, monitor:

1. **Server Logs:**
   - Cache hit/miss ratio
   - Scheduler health checks
   - Metabase query times
   - Any errors

2. **User Experience:**
   - Page load times
   - Score update frequency
   - User complaints (should decrease!)

3. **Performance Metrics:**
   - Response times
   - Cache effectiveness
   - Scheduler reliability

---

## Success Criteria Summary

### Phase 1: Quick Wins
- ✅ Parallel calculations work
- ✅ Frontend cache stores scores
- ✅ Cached scores display instantly

### Phase 2: Backend Caching
- ✅ Cache hits return <100ms
- ✅ Cache invalidates on update
- ✅ Cache expires after 5 minutes

### Phase 3: Metabase Optimization
- ✅ Date-filtered query works (if Card 1267 exists)
- ✅ Fallback works (if Card 1267 doesn't exist)
- ✅ Query time reduced by 85%

### Phase 4: Background Updates
- ✅ Scheduler runs hourly
- ✅ WebSocket updates work
- ✅ UI clarifies automatic updates
- ✅ Users don't need manual updates

---

## Questions or Issues?

If you encounter any issues during testing:
1. Check the relevant section in this guide
2. Review server logs for errors
3. Check browser console for client-side errors
4. Verify all files were updated correctly
5. Try the troubleshooting steps

All improvements include fallbacks and error handling, so the application should continue working even if some optimizations fail.
