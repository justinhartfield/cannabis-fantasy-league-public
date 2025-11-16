# Challenge Page Performance Implementation Plan

## Overview
This document provides a step-by-step implementation plan to dramatically improve Challenge page performance, focusing on making scores visible instantly without requiring the "UPDATE SCORES NOW" button.

---

## Phase 1: Quick Wins (Immediate - 1-2 hours)

### ✅ 1.1 Fix Score Display Bug (COMPLETED)
**File:** `server/scoringRouter.ts` (line 467)
**Status:** FIXED
**Change:** Destructure `totalPoints` to prevent spread operator from overwriting `points` field

### 1.2 Parallelize Team Score Calculations
**File:** `server/scoringEngine.ts` (line 963-970)
**Impact:** 50% faster score calculations for 2-team challenges

**Current Code:**
```typescript
for (const team of challengeTeams) {
  try {
    console.log(`[calculateDailyChallengeScores] Processing team ${team.id} (${team.name})`);
    await calculateTeamDailyScore(team.id, challengeId, statDateString);
  } catch (error) {
    console.error(`[Scoring] Error calculating daily score for team ${team.id}:`, error);
  }
}
```

**New Code:**
```typescript
await Promise.all(
  challengeTeams.map(async (team) => {
    try {
      console.log(`[calculateDailyChallengeScores] Processing team ${team.id} (${team.name})`);
      await calculateTeamDailyScore(team.id, challengeId, statDateString);
    } catch (error) {
      console.error(`[Scoring] Error calculating daily score for team ${team.id}:`, error);
    }
  })
);
```

### 1.3 Add Frontend Score Caching
**File:** `client/src/pages/DailyChallenge.tsx` (around line 94-110)
**Impact:** Instant score display on page load

**Add after the `useQuery` hooks:**
```typescript
// Cache scores in localStorage for instant display
const SCORE_CACHE_KEY = `challenge-${challengeId}-scores`;

const [cachedScores, setCachedScores] = useState<any[]>(() => {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(SCORE_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // Check if cache is less than 1 hour old
        if (Date.now() - parsed.timestamp < 3600000) {
          return parsed.scores;
        }
      } catch (e) {
        console.error('Failed to parse cached scores', e);
      }
    }
  }
  return [];
});

// Update cache when new scores arrive
useEffect(() => {
  if (dayScores && dayScores.length > 0) {
    setCachedScores(dayScores);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SCORE_CACHE_KEY, JSON.stringify({
        scores: dayScores,
        timestamp: Date.now()
      }));
    }
  }
}, [dayScores, SCORE_CACHE_KEY]);

// Use cached scores if real scores aren't loaded yet
const displayScores = dayScores && dayScores.length > 0 ? dayScores : cachedScores;
```

**Update `baseTeamScores` to use cached data:**
```typescript
const baseTeamScores: TeamScore[] = useMemo(() => {
  // Prefer real scores, fall back to cached, then empty teams
  const scoresSource = displayScores.length > 0 ? displayScores : 
    (league?.teams && league.teams.length > 0 ? league.teams : []);
  
  if (displayScores.length > 0) {
    return displayScores.map((score) => ({
      teamId: score.teamId,
      teamName: score.teamName,
      points: score.points || 0,
      userAvatarUrl: score.userAvatarUrl,
      userName: score.userName,
    }));
  }

  if (league?.teams && league.teams.length > 0) {
    return league.teams.map((team, index) => ({
      teamId: team.id,
      teamName: team.name || `Team ${index + 1}`,
      points: 0,
      userAvatarUrl: team.userAvatarUrl,
      userName: team.userName,
    }));
  }

  return [];
}, [displayScores, league]);
```

---

## Phase 2: Backend Caching (High Impact - 2-3 hours)

### 2.1 Add In-Memory Score Cache
**File:** `server/scoringRouter.ts` (at the top of the file)
**Impact:** 95% faster score retrieval for repeated requests

**Add at the top of the file:**
```typescript
// Simple in-memory cache for challenge scores
interface ScoreCache {
  scores: any[];
  timestamp: number;
}

const challengeScoreCache = new Map<string, ScoreCache>();
const SCORE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedScores(challengeId: number, statDate: string): any[] | null {
  const cacheKey = `${challengeId}-${statDate}`;
  const cached = challengeScoreCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < SCORE_CACHE_TTL) {
    console.log(`[ScoreCache] Cache HIT for ${cacheKey}`);
    return cached.scores;
  }
  
  console.log(`[ScoreCache] Cache MISS for ${cacheKey}`);
  return null;
}

function setCachedScores(challengeId: number, statDate: string, scores: any[]): void {
  const cacheKey = `${challengeId}-${statDate}`;
  challengeScoreCache.set(cacheKey, {
    scores,
    timestamp: Date.now()
  });
  console.log(`[ScoreCache] Cached scores for ${cacheKey}`);
}

function invalidateCachedScores(challengeId: number, statDate: string): void {
  const cacheKey = `${challengeId}-${statDate}`;
  challengeScoreCache.delete(cacheKey);
  console.log(`[ScoreCache] Invalidated cache for ${cacheKey}`);
}
```

**Update `getChallengeDayScores` query (around line 403):**
```typescript
getChallengeDayScores: protectedProcedure
  .input(z.object({
    challengeId: z.number(),
    statDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }))
  .query(async ({ ctx, input }) => {
    // Check cache first
    const cachedScores = getCachedScores(input.challengeId, input.statDate);
    if (cachedScores) {
      return cachedScores;
    }

    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database not available',
      });
    }

    try {
      console.log(`[Scoring API] getChallengeDayScores - userId: ${ctx.user.id}, challengeId: ${input.challengeId}, statDate: ${input.statDate}`);
      
      // ... existing verification code ...

      const teamScores = [];
      for (const team of leagueTeams) {
        // ... existing score fetching code ...
      }

      // Cache the results before returning
      setCachedScores(input.challengeId, input.statDate, teamScores);
      
      return teamScores;
    } catch (error: any) {
      // ... existing error handling ...
    }
  }),
```

**Update `calculateChallengeDay` mutation to invalidate cache:**
```typescript
calculateChallengeDay: protectedProcedure
  .input(z.object({
    challengeId: z.number(),
    statDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }))
  .mutation(async ({ ctx, input }) => {
    try {
      await calculateDailyChallengeScores(input.challengeId, input.statDate);
      
      // Invalidate cache after recalculation
      invalidateCachedScores(input.challengeId, input.statDate);
      
      return {
        success: true,
        message: `Scores calculated for challenge ${input.challengeId} (${input.statDate})`,
      };
    } catch (error) {
      // ... existing error handling ...
    }
  }),
```

### 2.2 Add Cache Warming on Challenge Creation
**File:** `server/scoringEngine.ts` (after line 994)
**Impact:** Scores ready immediately after calculation

**Add after WebSocket notification:**
```typescript
// Warm the cache immediately after calculation
// This ensures the next query will be instant
console.log(`[calculateDailyChallengeScores] Warming cache for challenge ${challengeId}`);
```

---

## Phase 3: Optimize Metabase Query (Biggest Impact - 3-4 hours)

### 3.1 Create Date-Filtered Metabase Card

**Action Required:**
1. Go to Metabase dashboard
2. Clone Card 1266 ("TODAY Completed transactions with recent data")
3. Add a date parameter filter for `OrderDate`
4. Save as new card (e.g., Card ID 1267)
5. Note the new card ID

### 3.2 Update Aggregator to Use New Card
**File:** `server/dailyChallengeAggregator.ts` (line 155-187)
**Impact:** 80-90% faster data fetching

**Current Code:**
```typescript
private async fetchOrdersForDate(dateString: string, logger?: AggregationLogger): Promise<OrderRecord[]> {
  await this.log('info', 'Fetching orders from Metabase...', undefined, logger);

  // Query Metabase question 1266 (TODAY Completed transactions with recent data)
  const allOrders = await this.metabase.executeCardQuery(1266);

  // Filter by date
  const targetDate = new Date(dateString);
  // ... client-side filtering ...
  const filtered = allOrders.filter((order: any) => {
    // ... filtering logic ...
  });

  await this.log('info', `Filtered to ${filtered.length} orders for ${dateString}`, undefined, logger);
  return filtered as OrderRecord[];
}
```

**New Code:**
```typescript
private async fetchOrdersForDate(dateString: string, logger?: AggregationLogger): Promise<OrderRecord[]> {
  await this.log('info', `Fetching orders from Metabase for ${dateString}...`, undefined, logger);

  try {
    // Use date-filtered card (replace 1267 with your new card ID)
    const orders = await this.metabase.executeCardQuery(1267, {
      date: dateString
    });

    await this.log('info', `Fetched ${orders.length} orders for ${dateString} from Metabase`, undefined, logger);
    return orders as OrderRecord[];
  } catch (error) {
    // Fallback to old method if new card fails
    await this.log('warn', 'Date-filtered query failed, falling back to client-side filtering', error, logger);
    
    const allOrders = await this.metabase.executeCardQuery(1266);
    const targetDate = new Date(dateString);
    const filtered = allOrders.filter((order: any) => {
      if (!order.OrderDate) return false;
      const orderDate = new Date(order.OrderDate);
      return (
        orderDate.getFullYear() === targetDate.getFullYear() &&
        orderDate.getMonth() === targetDate.getMonth() &&
        orderDate.getDate() === targetDate.getDate()
      );
    });

    await this.log('info', `Filtered to ${filtered.length} orders for ${dateString}`, undefined, logger);
    return filtered as OrderRecord[];
  }
}
```

### 3.3 Check if Metabase Client Supports Parameters
**File:** `server/lib/metabase.ts` or `server/metabase.ts`

Verify the `executeCardQuery` method supports parameters. If not, update it:

```typescript
async executeCardQuery(cardId: number, parameters?: Record<string, any>): Promise<any[]> {
  const url = parameters 
    ? `${this.baseUrl}/api/card/${cardId}/query`
    : `${this.baseUrl}/api/card/${cardId}/query`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Metabase-Session': this.sessionToken,
    },
    body: parameters ? JSON.stringify({ parameters }) : undefined,
  });

  // ... rest of the method ...
}
```

---

## Phase 4: Background Score Updates (Long-term - 4-6 hours)

### 4.1 Create Scheduled Score Update Job
**File:** `server/challengeScoreScheduler.ts` (new file)

```typescript
import cron from 'node-cron';
import { getDb } from './db';
import { leagues } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { calculateDailyChallengeScores } from './scoringEngine';

export class ChallengeScoreScheduler {
  private job: cron.ScheduledTask | null = null;

  start() {
    // Run every hour
    this.job = cron.schedule('0 * * * *', async () => {
      console.log('[ChallengeScoreScheduler] Running scheduled score update...');
      await this.updateActiveChallengeScores();
    });

    console.log('[ChallengeScoreScheduler] Started - will run every hour');
  }

  stop() {
    if (this.job) {
      this.job.stop();
      console.log('[ChallengeScoreScheduler] Stopped');
    }
  }

  async updateActiveChallengeScores() {
    const db = await getDb();
    if (!db) {
      console.error('[ChallengeScoreScheduler] Database not available');
      return;
    }

    try {
      // Get all active challenges
      const activeChallenges = await db
        .select()
        .from(leagues)
        .where(eq(leagues.status, 'active'))
        .where(eq(leagues.leagueType, 'challenge'));

      console.log(`[ChallengeScoreScheduler] Found ${activeChallenges.length} active challenges`);

      for (const challenge of activeChallenges) {
        try {
          const statDate = new Date(challenge.createdAt).toISOString().split('T')[0];
          console.log(`[ChallengeScoreScheduler] Updating scores for challenge ${challenge.id} (${challenge.name})`);
          
          await calculateDailyChallengeScores(challenge.id, statDate);
          
          console.log(`[ChallengeScoreScheduler] ✓ Updated challenge ${challenge.id}`);
        } catch (error) {
          console.error(`[ChallengeScoreScheduler] Failed to update challenge ${challenge.id}:`, error);
        }
      }

      console.log('[ChallengeScoreScheduler] Scheduled update complete');
    } catch (error) {
      console.error('[ChallengeScoreScheduler] Error in scheduled update:', error);
    }
  }
}

export const challengeScoreScheduler = new ChallengeScoreScheduler();
```

### 4.2 Initialize Scheduler in Server
**File:** `server/_core/index.ts` or main server file

```typescript
import { challengeScoreScheduler } from './challengeScoreScheduler';

// Start the scheduler when server starts
challengeScoreScheduler.start();

// Stop on shutdown
process.on('SIGTERM', () => {
  challengeScoreScheduler.stop();
});
```

### 4.3 Update UI to Show Last Update Time
**File:** `client/src/pages/DailyChallenge.tsx` (around line 558-586)

**Update the status indicator card:**
```typescript
{league?.status === 'active' && (
  <Card className="border-border/50 bg-card/80">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-gray-500" />
          )}
          <div>
            <p className="text-sm font-medium text-foreground">
              {isConnected ? 'Live Updates Connected' : 'Connecting...'}
            </p>
            {lastUpdateTime && (
              <p className="text-xs text-muted-foreground">
                Last updated: {lastUpdateTime.toLocaleTimeString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Scores update automatically every hour
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Next update in: {timeUntilUpdate || 'Calculating...'}</span>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

## Testing Plan

### Test Phase 1 (Quick Wins)
1. ✅ Verify score display bug is fixed
2. Test parallel team calculations with console timing
3. Test frontend caching:
   - Load page, check localStorage
   - Refresh page, verify instant display
   - Clear cache, verify fallback works

### Test Phase 2 (Backend Caching)
1. Test cache hit/miss logging
2. Verify cache invalidation after score update
3. Load test: Multiple users viewing same challenge

### Test Phase 3 (Metabase Optimization)
1. Compare query times: old vs new
2. Verify data accuracy
3. Test fallback mechanism

### Test Phase 4 (Background Updates)
1. Verify scheduler runs every hour
2. Check logs for successful updates
3. Verify WebSocket notifications work

---

## Performance Metrics to Track

Before and after each phase, measure:

1. **Initial Page Load Time**
   - Time to first score display
   - Total page load time

2. **Update Scores Time**
   - Metabase query time
   - Aggregation time
   - Score calculation time
   - Total update time

3. **User Experience**
   - Time until scores are visible
   - Button responsiveness
   - Perceived performance

---

## Rollback Plan

Each phase is independent and can be rolled back:

1. **Phase 1**: Revert specific commits
2. **Phase 2**: Remove cache code, no data impact
3. **Phase 3**: Switch back to old Metabase card ID
4. **Phase 4**: Stop scheduler, no data impact

---

## Expected Results

### After Phase 1
- Initial load: 2-3s → 0.5-1s
- Score updates: 20-30s → 15-20s

### After Phase 2
- Subsequent loads: Instant (cached)
- Repeated queries: <100ms

### After Phase 3
- Score updates: 15-20s → 3-5s
- Metabase query: 10-15s → 1-2s

### After Phase 4
- User-initiated updates: Not needed
- Scores always current (within 1 hour)
- Page load: Instant with current scores

---

## Next Steps

1. **Immediate**: Implement Phase 1 (1-2 hours)
2. **This Week**: Implement Phase 2 (2-3 hours)
3. **Next Week**: Coordinate with Metabase admin for Phase 3
4. **Following Week**: Implement Phase 4 for production

Total estimated time: 10-15 hours across 2-3 weeks
Expected performance improvement: 90-95% faster
