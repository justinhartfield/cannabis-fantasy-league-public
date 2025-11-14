-- Daily Challenge Stats Tables
-- Optimized for single-day performance tracking

-- Manufacturer Daily Challenge Stats
CREATE TABLE IF NOT EXISTS "manufacturerDailyChallengeStats" (
  "id" SERIAL PRIMARY KEY,
  "manufacturerId" INTEGER NOT NULL REFERENCES "manufacturers"("id") ON DELETE CASCADE,
  "statDate" DATE NOT NULL,
  "salesVolumeGrams" INTEGER DEFAULT 0 NOT NULL,
  "orderCount" INTEGER DEFAULT 0 NOT NULL,
  "revenueCents" INTEGER DEFAULT 0 NOT NULL,
  "totalPoints" INTEGER DEFAULT 0 NOT NULL,
  "rank" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT "manufacturer_daily_challenge_unique" UNIQUE ("manufacturerId", "statDate")
);

CREATE INDEX IF NOT EXISTS "manufacturer_daily_challenge_date_idx" ON "manufacturerDailyChallengeStats"("statDate");
CREATE INDEX IF NOT EXISTS "manufacturer_daily_challenge_rank_idx" ON "manufacturerDailyChallengeStats"("statDate", "rank");

-- Strain Daily Challenge Stats
CREATE TABLE IF NOT EXISTS "strainDailyChallengeStats" (
  "id" SERIAL PRIMARY KEY,
  "strainId" INTEGER NOT NULL REFERENCES "strains"("id") ON DELETE CASCADE,
  "statDate" DATE NOT NULL,
  "salesVolumeGrams" INTEGER DEFAULT 0 NOT NULL,
  "orderCount" INTEGER DEFAULT 0 NOT NULL,
  "totalPoints" INTEGER DEFAULT 0 NOT NULL,
  "rank" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT "strain_daily_challenge_unique" UNIQUE ("strainId", "statDate")
);

CREATE INDEX IF NOT EXISTS "strain_daily_challenge_date_idx" ON "strainDailyChallengeStats"("statDate");
CREATE INDEX IF NOT EXISTS "strain_daily_challenge_rank_idx" ON "strainDailyChallengeStats"("statDate", "rank");

-- Pharmacy Daily Challenge Stats
CREATE TABLE IF NOT EXISTS "pharmacyDailyChallengeStats" (
  "id" SERIAL PRIMARY KEY,
  "pharmacyId" INTEGER NOT NULL REFERENCES "pharmacies"("id") ON DELETE CASCADE,
  "statDate" DATE NOT NULL,
  "orderCount" INTEGER DEFAULT 0 NOT NULL,
  "revenueCents" INTEGER DEFAULT 0 NOT NULL,
  "totalPoints" INTEGER DEFAULT 0 NOT NULL,
  "rank" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT "pharmacy_daily_challenge_unique" UNIQUE ("pharmacyId", "statDate")
);

CREATE INDEX IF NOT EXISTS "pharmacy_daily_challenge_date_idx" ON "pharmacyDailyChallengeStats"("statDate");
CREATE INDEX IF NOT EXISTS "pharmacy_daily_challenge_rank_idx" ON "pharmacyDailyChallengeStats"("statDate", "rank");

-- Brand Daily Challenge Stats
CREATE TABLE IF NOT EXISTS "brandDailyChallengeStats" (
  "id" SERIAL PRIMARY KEY,
  "brandId" INTEGER NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "statDate" DATE NOT NULL,
  "salesVolumeGrams" INTEGER DEFAULT 0 NOT NULL,
  "orderCount" INTEGER DEFAULT 0 NOT NULL,
  "totalPoints" INTEGER DEFAULT 0 NOT NULL,
  "rank" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  CONSTRAINT "brand_daily_challenge_unique" UNIQUE ("brandId", "statDate")
);

CREATE INDEX IF NOT EXISTS "brand_daily_challenge_date_idx" ON "brandDailyChallengeStats"("statDate");
CREATE INDEX IF NOT EXISTS "brand_daily_challenge_rank_idx" ON "brandDailyChallengeStats"("statDate", "rank");
