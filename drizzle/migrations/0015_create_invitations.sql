CREATE TABLE IF NOT EXISTS "invitations" (
	"id" serial PRIMARY KEY,
	"leagueId" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"invitedBy" integer NOT NULL,
	"status" varchar(20) NOT NULL DEFAULT 'pending',
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"acceptedAt" timestamp with time zone
);

CREATE UNIQUE INDEX IF NOT EXISTS "invitations_token_unique" ON "invitations" ("token");
CREATE INDEX IF NOT EXISTS "invitations_token_idx" ON "invitations" ("token");
CREATE INDEX IF NOT EXISTS "invitations_league_idx" ON "invitations" ("leagueId");
CREATE INDEX IF NOT EXISTS "invitations_email_idx" ON "invitations" ("email");

-- Add PRIMARY KEY to leagues.id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leagues_pkey' 
        AND conrelid = 'leagues'::regclass
    ) THEN
        ALTER TABLE "leagues" ADD PRIMARY KEY ("id");
    END IF;
END $$;

ALTER TABLE "invitations"
	ADD CONSTRAINT "invitations_league_fk"
	FOREIGN KEY ("leagueId") REFERENCES "leagues" ("id") ON DELETE CASCADE;

ALTER TABLE "invitations"
	ADD CONSTRAINT "invitations_invited_by_fk"
	FOREIGN KEY ("invitedBy") REFERENCES "users" ("id") ON DELETE CASCADE;

