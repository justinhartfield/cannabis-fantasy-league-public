-- Add battlefield_background column to teams table
-- Allows users to customize their battle arena background

ALTER TABLE teams ADD COLUMN IF NOT EXISTS battlefield_background VARCHAR(100);

