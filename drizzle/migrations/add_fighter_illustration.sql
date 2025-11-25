-- Add fighter illustration column to teams table
-- This allows users to select their "fighter" mascot for daily challenges

ALTER TABLE teams ADD COLUMN IF NOT EXISTS fighter_illustration VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN teams.fighter_illustration IS 'Selected illustration filename for the team mascot in daily challenges';

