-- Add battlefieldBackground column to teams table
-- Allows users to customize their battle arena background

ALTER TABLE teams ADD COLUMN IF NOT EXISTS "battlefieldBackground" VARCHAR(100);

