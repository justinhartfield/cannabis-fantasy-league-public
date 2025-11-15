# Daily Challenge Stats Aggregation

## Overview

The draft board sorting and daily challenge scoring depend on daily aggregated statistics from Metabase order data. These stats must be populated regularly to ensure accurate sorting and scoring.

## What Gets Aggregated

The daily aggregation process populates the following tables:

1. **manufacturerDailyChallengeStats** - Manufacturer sales and points
2. **strainDailyChallengeStats** - Cannabis strain sales and points  
3. **productDailyChallengeStats** - Product (pharmaceutical) sales and points
4. **pharmacyDailyChallengeStats** - Pharmacy sales and points
5. **brandDailyChallengeStats** - Brand ratings and points

## When to Run

- **Daily**: Automatically via cron job (if configured)
- **Manual**: When you notice missing data or sorting issues
- **After data imports**: When new entities are added to the system

## How to Run

### Option 1: Via Admin Panel (Recommended)

1. Log in as an admin user
2. Navigate to **Admin** → **Data Sync**
3. Click **"Sync Daily Challenge Stats"**
4. Select the date (defaults to today)
5. Wait for completion

### Option 2: Via Command Line

```bash
cd /path/to/cannabis-fantasy-league
npx tsx scripts/run-daily-aggregation.ts
```

This will aggregate both yesterday and today's data.

### Option 3: Via tRPC API

```typescript
await trpc.admin.syncDailyChallengeStats.mutate({
  statDate: '2025-11-14' // YYYY-MM-DD format
});
```

## Symptoms of Missing Data

### Draft Board
- Sorting by "Absteigend" (descending) doesn't work for Strains or Products
- All players show 0 points or null values
- Yesterday/Today scores are missing

### Daily Challenge
- No scoring breakdown available
- All positions show 0 points
- Leaderboard is empty

## Troubleshooting

### Check if data exists

Look for these log messages when loading the draft board:

```
[getAvailableCannabisStrains] Sample data: [
  { name: "...", yesterdayPoints: null, todayPoints: null }  // ❌ Missing data
]
```

vs.

```
[getAvailableCannabisStrains] Sample data: [
  { name: "...", yesterdayPoints: 150, todayPoints: 200 }  // ✅ Data exists
]
```

### Common Issues

1. **Metabase connection not configured**
   - Check `METABASE_URL` and `METABASE_API_KEY` environment variables

2. **Database not available**
   - Ensure `DATABASE_URL` is set correctly
   - Check database connection

3. **Entity names don't match**
   - Aggregation skips entities not found in the database
   - Check logs for "not found" warnings

## Scheduling (Production)

### Using node-cron (Built-in)

The `DailyStatsScheduler` class handles automatic daily aggregation:

```typescript
// In server/index.ts or similar
import { dailyStatsScheduler } from './server/dailyStatsScheduler';

// Start the scheduler (runs at 2 AM daily)
dailyStatsScheduler.start();
```

### Using System Cron

Add to crontab:

```bash
# Run daily at 2 AM
0 2 * * * cd /path/to/app && npx tsx scripts/run-daily-aggregation.ts >> /var/log/daily-aggregation.log 2>&1
```

## Data Retention

Daily challenge stats are retained indefinitely for historical analysis. Consider implementing cleanup if storage becomes an issue:

```sql
-- Delete stats older than 90 days
DELETE FROM "strainDailyChallengeStats" 
WHERE "statDate" < NOW() - INTERVAL '90 days';
```

## Related Files

- `server/dailyChallengeAggregator.ts` - Core aggregation logic
- `server/dailyStatsScheduler.ts` - Cron scheduler
- `scripts/run-daily-aggregation.ts` - Manual execution script
- `drizzle/dailyChallengeSchema.ts` - Database schema
