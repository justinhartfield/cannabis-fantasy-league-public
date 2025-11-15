#!/bin/bash

# Prediction Streak Migration Script for Render
# Run this in Render Shell after deploying the feature branch

echo "🚀 Running Prediction Streak Migration..."

psql $DATABASE_URL << 'EOF'
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

CREATE INDEX IF NOT EXISTS "matchup_date_idx" ON "dailyMatchups" ("matchupDate");
CREATE INDEX IF NOT EXISTS "matchup_scored_idx" ON "dailyMatchups" ("isScored");
CREATE UNIQUE INDEX IF NOT EXISTS "matchup_unique" ON "dailyMatchups" ("matchupDate", "entityAId", "entityBId");

-- Create userPredictions table
CREATE TABLE IF NOT EXISTS "userPredictions" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "matchupId" INTEGER NOT NULL,
  "predictedWinnerId" INTEGER NOT NULL,
  "isCorrect" INTEGER,
  "submittedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "user_matchup_idx" ON "userPredictions" ("userId", "matchupId");
CREATE INDEX IF NOT EXISTS "user_predictions_date_idx" ON "userPredictions" ("submittedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "user_matchup_unique" ON "userPredictions" ("userId", "matchupId");

-- Add prediction streak fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "currentPredictionStreak" INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "longestPredictionStreak" INTEGER DEFAULT 0 NOT NULL;

SELECT '✅ Migration completed successfully!' as status;
EOF

echo "✅ Done! Prediction Streak tables created."
