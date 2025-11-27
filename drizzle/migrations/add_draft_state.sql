-- Add draft state tracking to leagues table
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "draftStarted" BOOLEAN DEFAULT FALSE;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "draftCompleted" BOOLEAN DEFAULT FALSE;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "currentDraftPick" INT DEFAULT 1;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "currentDraftRound" INT DEFAULT 1;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS "draftPickTimeLimit" INT DEFAULT 90; -- seconds per pick

-- Create draft picks history table (PostgreSQL syntax)
CREATE TABLE IF NOT EXISTS "draftPicks" (
  "id" SERIAL PRIMARY KEY,
  "leagueId" INT NOT NULL,
  "teamId" INT NOT NULL,
  "pickNumber" INT NOT NULL,
  "round" INT NOT NULL,
  "assetType" VARCHAR(50) NOT NULL,
  "assetId" INT NOT NULL,
  "pickTime" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes separately (PostgreSQL syntax)
CREATE UNIQUE INDEX IF NOT EXISTS "draft_picks_league_pick_idx" ON "draftPicks" ("leagueId", "pickNumber");
CREATE INDEX IF NOT EXISTS "draft_picks_team_idx" ON "draftPicks" ("teamId");
CREATE INDEX IF NOT EXISTS "draft_picks_league_idx" ON "draftPicks" ("leagueId");
