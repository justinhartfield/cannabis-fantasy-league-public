ALTER TABLE "brandDailyChallengeStats"
ADD COLUMN IF NOT EXISTS "ratingDelta" integer DEFAULT 0 NOT NULL;

ALTER TABLE "brandDailyChallengeStats"
ADD COLUMN IF NOT EXISTS "bayesianDelta" numeric(4, 2) DEFAULT '0' NOT NULL;

