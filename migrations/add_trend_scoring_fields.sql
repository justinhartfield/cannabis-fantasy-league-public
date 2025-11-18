-- Migration: Add Trend-Based Scoring Fields
-- Date: 2025-11-18
-- Description: Adds fields for trend momentum, consistency, velocity, streak, and market share tracking

-- Add new fields to manufacturerDailyChallengeStats
ALTER TABLE "manufacturerDailyChallengeStats"
ADD COLUMN IF NOT EXISTS "previousRank" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "trendMultiplier" numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "consistencyScore" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "velocityScore" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "streakDays" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "marketSharePercent" numeric(5,2) DEFAULT 0;

-- Add new fields to strainDailyChallengeStats
ALTER TABLE "strainDailyChallengeStats"
ADD COLUMN IF NOT EXISTS "previousRank" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "trendMultiplier" numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "consistencyScore" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "velocityScore" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "streakDays" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "marketSharePercent" numeric(5,2) DEFAULT 0;

-- Add new fields to productDailyChallengeStats
ALTER TABLE "productDailyChallengeStats"
ADD COLUMN IF NOT EXISTS "previousRank" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "trendMultiplier" numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "consistencyScore" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "velocityScore" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "streakDays" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "marketSharePercent" numeric(5,2) DEFAULT 0;

-- Add new fields to pharmacyDailyChallengeStats
ALTER TABLE "pharmacyDailyChallengeStats"
ADD COLUMN IF NOT EXISTS "previousRank" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "trendMultiplier" numeric(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "consistencyScore" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "velocityScore" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "streakDays" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "marketSharePercent" numeric(5,2) DEFAULT 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "manufacturer_daily_challenge_streak_idx" ON "manufacturerDailyChallengeStats"("streakDays" DESC);
CREATE INDEX IF NOT EXISTS "strain_daily_challenge_streak_idx" ON "strainDailyChallengeStats"("streakDays" DESC);
CREATE INDEX IF NOT EXISTS "product_daily_challenge_streak_idx" ON "productDailyChallengeStats"("streakDays" DESC);
CREATE INDEX IF NOT EXISTS "pharmacy_daily_challenge_streak_idx" ON "pharmacyDailyChallengeStats"("streakDays" DESC);

-- Comments for documentation
COMMENT ON COLUMN "manufacturerDailyChallengeStats"."previousRank" IS 'Rank from the previous day for momentum calculation';
COMMENT ON COLUMN "manufacturerDailyChallengeStats"."trendMultiplier" IS 'Days7/Days1 ratio from TrendMetrics';
COMMENT ON COLUMN "manufacturerDailyChallengeStats"."consistencyScore" IS 'Stability bonus based on variance in performance';
COMMENT ON COLUMN "manufacturerDailyChallengeStats"."velocityScore" IS 'Acceleration bonus based on growth rate changes';
COMMENT ON COLUMN "manufacturerDailyChallengeStats"."streakDays" IS 'Consecutive days in top 10';
COMMENT ON COLUMN "manufacturerDailyChallengeStats"."marketSharePercent" IS 'Percentage of total market volume';
