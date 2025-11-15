-- ============================================================================
-- PREDICTION STREAK TABLES MIGRATION
-- ============================================================================

-- Create dailyMatchups table
CREATE TABLE IF NOT EXISTS "dailyMatchups" (
  "id" SERIAL PRIMARY KEY,
  "matchupDate" DATE NOT NULL,
  "entityType" VARCHAR(50) NOT NULL,
  "entityAId" INTEGER NOT NULL,
  "entityBId" INTEGER NOT NULL,
  "entityAName" VARCHAR(255) NOT NULL,
  "entityBName" VARCHAR(255) NOT NULL,
  "winnerId" INTEGER,
  "entityAPoints" INTEGER,
  "entityBPoints" INTEGER,
  "isScored" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX "matchup_date_idx" ON "dailyMatchups" ("matchupDate");
CREATE INDEX "matchup_scored_idx" ON "dailyMatchups" ("isScored");
CREATE UNIQUE INDEX "matchup_unique" ON "dailyMatchups" ("matchupDate", "entityAId", "entityBId");

-- Create userPredictions table
CREATE TABLE IF NOT EXISTS "userPredictions" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "matchupId" INTEGER NOT NULL,
  "predictedWinnerId" INTEGER NOT NULL,
  "isCorrect" INTEGER,
  "submittedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX "user_matchup_idx" ON "userPredictions" ("userId", "matchupId");
CREATE INDEX "user_predictions_date_idx" ON "userPredictions" ("submittedAt");
CREATE UNIQUE INDEX "user_matchup_unique" ON "userPredictions" ("userId", "matchupId");

-- Add prediction streak fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "currentPredictionStreak" INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "longestPredictionStreak" INTEGER DEFAULT 0 NOT NULL;
