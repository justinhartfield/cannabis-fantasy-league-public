-- Add draft state columns to leagues table
ALTER TABLE leagues 
ADD COLUMN draftStarted BOOLEAN DEFAULT FALSE,
ADD COLUMN draftCompleted BOOLEAN DEFAULT FALSE,
ADD COLUMN currentDraftPick INTEGER DEFAULT 1,
ADD COLUMN currentDraftRound INTEGER DEFAULT 1,
ADD COLUMN draftPickTimeLimit INTEGER DEFAULT 120;
