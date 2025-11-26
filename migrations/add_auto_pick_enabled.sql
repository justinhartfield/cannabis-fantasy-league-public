-- Add autoPickEnabled column to teams table
-- This column tracks whether auto-pick is enabled for a team during a draft
-- When a user lets the draft timer expire (goes to 0:00), auto-pick is automatically enabled

ALTER TABLE teams ADD COLUMN IF NOT EXISTS "autoPickEnabled" INTEGER DEFAULT 0 NOT NULL;

-- Index for efficient lookups during draft
CREATE INDEX IF NOT EXISTS idx_teams_auto_pick_league ON teams("leagueId", "autoPickEnabled");

