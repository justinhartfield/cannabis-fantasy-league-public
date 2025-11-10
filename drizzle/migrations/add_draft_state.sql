-- Add draft state tracking to leagues table
ALTER TABLE leagues ADD COLUMN draftStarted BOOLEAN DEFAULT FALSE;
ALTER TABLE leagues ADD COLUMN draftCompleted BOOLEAN DEFAULT FALSE;
ALTER TABLE leagues ADD COLUMN currentDraftPick INT DEFAULT 1;
ALTER TABLE leagues ADD COLUMN currentDraftRound INT DEFAULT 1;
ALTER TABLE leagues ADD COLUMN draftPickTimeLimit INT DEFAULT 90; -- seconds per pick

-- Create draft picks history table
CREATE TABLE IF NOT EXISTS draftPicks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leagueId INT NOT NULL,
  teamId INT NOT NULL,
  pickNumber INT NOT NULL,
  round INT NOT NULL,
  assetType ENUM('manufacturer', 'cannabis_strain', 'product', 'pharmacy') NOT NULL,
  assetId INT NOT NULL,
  pickTime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY league_pick_idx (leagueId, pickNumber),
  INDEX team_idx (teamId),
  INDEX league_idx (leagueId)
);
