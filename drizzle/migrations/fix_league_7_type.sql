-- Fix league 7 (Regular Season) to be challenge type instead of season type
-- This ensures it links to /challenge/7 instead of /league/7

UPDATE leagues 
SET "leagueType" = 'challenge' 
WHERE id = 7;

-- Verify the change
SELECT id, name, "leagueType" FROM leagues WHERE id = 7;
