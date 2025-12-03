-- Migration: Add halftime and overtime fields to leagues table
-- Also creates halftimeSubstitutions table for soccer-style subs at 4:20 PM

-- Add challenge timing fields to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "durationHours" INTEGER DEFAULT 24;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "challengeStartTime" TIMESTAMPTZ;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "challengeEndTime" TIMESTAMPTZ;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "halftimeAt" TIMESTAMPTZ;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "halftimeScoreTeam1" INTEGER;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "halftimeScoreTeam2" INTEGER;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "isHalftimePassed" BOOLEAN DEFAULT FALSE;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "isInOvertime" BOOLEAN DEFAULT FALSE;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "overtimeEndTime" TIMESTAMPTZ;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "overtimeWinnerId" INTEGER;

-- Create halftimeSubstitutions table for tracking lineup changes at halftime
CREATE TABLE IF NOT EXISTS "halftimeSubstitutions" (
  "id" SERIAL PRIMARY KEY,
  "challengeId" INTEGER NOT NULL,
  "teamId" INTEGER NOT NULL,
  "position" VARCHAR(20) NOT NULL,
  "oldAssetType" VARCHAR(50) NOT NULL,
  "oldAssetId" INTEGER NOT NULL,
  "newAssetType" VARCHAR(50) NOT NULL,
  "newAssetId" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for halftimeSubstitutions
CREATE INDEX IF NOT EXISTS "halftime_sub_challenge_idx" ON "halftimeSubstitutions" ("challengeId");
CREATE INDEX IF NOT EXISTS "halftime_sub_team_idx" ON "halftimeSubstitutions" ("teamId");

-- Unique constraint: one sub per position per team per challenge
CREATE UNIQUE INDEX IF NOT EXISTS "halftime_sub_unique" 
  ON "halftimeSubstitutions" ("challengeId", "teamId", "position");

-- Add comment for documentation
COMMENT ON COLUMN leagues."durationHours" IS 'Challenge duration in hours (4-168)';
COMMENT ON COLUMN leagues."halftimeAt" IS 'Halftime moment - 4:20 PM for 24h games, midpoint for others';
COMMENT ON COLUMN leagues."isInOvertime" IS 'Golden Goal overtime - triggers when scores within 50 pts';
COMMENT ON TABLE "halftimeSubstitutions" IS 'Soccer-style lineup changes allowed at halftime (max 2 per team)';

