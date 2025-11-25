-- Migration: Add autoDraftBoards table for wishlist feature
-- Created: 2025-11-25

CREATE TABLE IF NOT EXISTS "autoDraftBoards" (
  "id" serial PRIMARY KEY,
  "teamId" integer NOT NULL,
  "assetType" varchar(50) NOT NULL,
  "assetId" integer NOT NULL,
  "priority" integer NOT NULL,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "auto_draft_team_idx" ON "autoDraftBoards" ("teamId");
CREATE INDEX IF NOT EXISTS "auto_draft_priority_idx" ON "autoDraftBoards" ("teamId", "priority");

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS "auto_draft_team_asset_unique" ON "autoDraftBoards" ("teamId", "assetType", "assetId");

