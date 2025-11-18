# Trend-Based Scoring System: Implementation & Deployment Guide

**Author:** Manus AI  
**Date:** November 18, 2025

## 1. Overview

This document provides a comprehensive guide to the new **Trend-Based Scoring System** for the Cannabis Fantasy League. This system redesigns the core scoring logic to replace explicit sales metrics (grams sold, euro revenue) with more abstract, relative performance indicators. This protects sensitive business data while creating a more strategic and engaging gameplay experience.

The new system is built around the concept of **Trend Momentum**, which measures an entity's growth rate and market dynamics. It also includes several advanced metrics to reward consistency, acceleration, and market position.

## 2. New Scoring Components

The new scoring system is composed of several new metrics that work together to create a holistic view of an entity's performance.

| Component | Description | Example | Points System |
| :--- | :--- | :--- | :--- |
| **Trend Momentum** | Measures growth rate from Day 1 to Day 7 | `6.5x` | `(Days7 / Days1) * 20` |
| **Consistency Score** | Rewards stable performance with low variance | `85/100` | Up to 50 bonus points |
| **Velocity Score** | Awards points for accelerating growth | `+45` | Up to 100 bonus points |
| **Streak Bonus** | Bonus for consecutive days in the top 10 | `🔥 5d` | `+5` points per day, exponential for 7+ |
| **Market Share Bonus** | Tiered bonus for significant market position | `12.5%` | Up to 50 bonus points |
| **Momentum Bonus** | Points for rank improvement over time | `↑2 ranks` | `+10` points per rank gained |

## 3. Before & After: Scoring Display

The most significant change is in how scoring is displayed to the user. Explicit sales data is completely removed and replaced with intuitive, trend-based indicators.

### Before (Explicit Sales)

```
Four 20 Pharma
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sales Volume: 3,629g ÷ 10 = 362 pts
Order Count: 45 orders × 5 = 225 pts
Revenue: €1,234.56 ÷ 10 = 123 pts
Rank Bonus: Rank #1 = +50 pts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 760 pts
```

### After (Trend-Based)

```
Four 20 Pharma
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Activity: 45 orders × 10 = 450 pts
Trend Momentum: 6.5x × 20 = 130 pts
Rank Bonus: Rank #1 = +50 pts
Position Gain: ↑2 ranks = +20 pts
Consistency Bonus: 85/100 = +42 pts
Velocity Bonus: Accelerating = +45 pts
Streak Bonus: 5 days = +25 pts
Market Share Bonus: 12.5% = +50 pts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: 812 pts
```

## 4. Deployment Instructions

Follow these steps to deploy the new trend-based scoring system.

### Step 1: Run Database Migration

First, you need to update the database schema to include the new fields required for trend-based scoring. A migration script has been created to handle this automatically.

```bash
# Navigate to the project directory
cd /home/ubuntu/cannabis-fantasy-league

# Run the migration script
npm run tsx scripts/run-trend-migration.ts
```

This script will execute the `migrations/add_trend_scoring_fields.sql` file, which adds the following columns to the daily challenge stats tables:

- `previousRank`
- `trendMultiplier`
- `consistencyScore`
- `velocityScore`
- `streakDays`
- `marketSharePercent`

The script is idempotent and can be run multiple times without causing errors.

### Step 2: Run the New Data Aggregator

Next, run the new data aggregator (`dailyChallengeAggregatorV2.ts`) to fetch TrendMetrics data and calculate the new scores. This script runs in parallel with the old system, so it will not affect existing data.

```bash
# Run the new aggregator for a specific date
npm run tsx scripts/sync-daily-stats.ts -- --date=YYYY-MM-DD --useTrendScoring
```

- The `--useTrendScoring` flag enables the new scoring logic.
- The `--date` flag specifies the date to aggregate.

### Step 3: Enable the New Frontend Display

The `ScoringBreakdownV2.tsx` component has a `useTrendDisplay` prop that toggles the new display. To enable it, you can either set the default to `true` or pass it from the parent component (e.g., `DailyChallenge.tsx`).

```typescript
// In ScoringBreakdownV2.tsx
export default function ScoringBreakdownV2({
  data,
  leagueAverage,
  weeklyTrend,
  useTrendDisplay = true, // Set to true to enable
}: ScoringBreakdownProps) {
  // ...
}
```

### Step 4: Full Cutover

Once you have validated the new system and are ready to make it the default, you can:

1.  **Remove the old scoring engine** (`dailyChallengeScoringEngine.ts`).
2.  **Rename `dailyChallengeAggregatorV2.ts`** to `dailyChallengeAggregator.ts`.
3.  **Remove the `useTrendScoring` flag** and make the new logic the default.
4.  **Remove the old `ScoringBreakdown.tsx`** and rename `ScoringBreakdownV2.tsx`.

## 5. Testing & Validation

Several scripts have been created to help you test and validate the new system.

### Unit & Integration Tests

The `test-trend-scoring.ts` script runs a series of unit tests on the new scoring functions and provides a detailed breakdown of the results.

```bash
# Run the test script
npm run tsx scripts/test-trend-scoring.ts
```

### Old vs. New Comparison

The `compare-scoring-systems.ts` script fetches real data from TrendMetrics and generates a side-by-side comparison of the old and new scoring systems for the top 15 entities.

```bash
# Run the comparison script
npm run tsx scripts/compare-scoring-systems.ts
```

This will produce a table that clearly shows the difference in scores and helps with balancing and tuning.

## 6. Summary of File Changes

### New Files

- `server/trendScoringEngine.ts`: Core logic for the new scoring system.
- `server/trendMetricsFetcher.ts`: Fetches and processes data from TrendMetrics.
- `server/dailyChallengeAggregatorV2.ts`: Enhanced aggregator with trend scoring.
- `server/trendScoringBreakdowns.ts`: Formats trend data for API responses.
- `client/src/components/ScoringBreakdownV2.tsx`: New frontend component for display.
- `migrations/add_trend_scoring_fields.sql`: SQL migration for database schema.
- `scripts/run-trend-migration.ts`: Script to run the database migration.
- `scripts/test-trend-scoring.ts`: Unit tests for the new scoring engine.
- `scripts/compare-scoring-systems.ts`: Comparison script for validation.

### Modified Files

- `drizzle/dailyChallengeSchema.ts`: Added new fields to the database schema.
- `server/scoringEngine.ts`: Can be updated to use the new breakdown builders.
- `client/src/pages/DailyChallenge.tsx`: Can be updated to use the new `ScoringBreakdownV2` component.

## 7. Conclusion

This trend-based scoring system represents a significant step forward for the Cannabis Fantasy League. It enhances privacy, increases strategic depth, and provides a more engaging user experience. The implementation is modular, testable, and ready for a phased rollout.
