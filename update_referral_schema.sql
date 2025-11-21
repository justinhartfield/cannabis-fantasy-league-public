-- SQL migration to safely add referral system tables and columns
-- Run this script against your database to fix the missing schema elements

-- 1. Add new columns to 'users' table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCredits" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "streakFreezeTokens" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referralCode" varchar(32);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referredByUserId" integer;

-- Add constraints/indexes for users if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_referralCode_unique') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_referralCode_unique" UNIQUE ("referralCode");
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_referredBy_idx" ON "users" ("referredByUserId");

-- 2. Create 'referrals' table
CREATE TABLE IF NOT EXISTS "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrerUserId" integer NOT NULL,
	"referredUserId" integer NOT NULL,
	"referralCode" varchar(32) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"trigger" varchar(50),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"completedAt" timestamp with time zone,
    CONSTRAINT "referrals_referredUser_unique" UNIQUE ("referredUserId")
);

CREATE INDEX IF NOT EXISTS "referrals_referrer_idx" ON "referrals" ("referrerUserId");
CREATE INDEX IF NOT EXISTS "referrals_code_idx" ON "referrals" ("referralCode");

-- 3. Create 'streakFreezes' table
CREATE TABLE IF NOT EXISTS "streakFreezes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"scope" varchar(50) DEFAULT 'prediction' NOT NULL,
	"period" date NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"usedAt" timestamp with time zone,
	"expiresAt" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "streak_freezes_user_idx" ON "streakFreezes" ("userId");
CREATE INDEX IF NOT EXISTS "streak_freezes_period_idx" ON "streakFreezes" ("period");

-- 4. Ensure 'products' and 'productDailyStats' exist (mentioned in logs as missing)
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(500) NOT NULL,
	"slug" varchar(500),
	"manufacturerId" integer,
	"brandId" integer,
	"strainId" integer,
	"thcPercentage" varchar(50),
	"cbdPercentage" varchar(50),
	"productCode" varchar(100),
	"imageUrl" varchar(500),
	"description" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "products_name_unique" UNIQUE ("name")
);
CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products" ("name");

CREATE TABLE IF NOT EXISTS "productDailyStats" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"statDate" date NOT NULL,
	"salesVolumeGrams" integer DEFAULT 0 NOT NULL,
	"orderCount" integer DEFAULT 0 NOT NULL,
	"revenueCents" integer DEFAULT 0 NOT NULL,
	"totalPoints" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "product_daily_unique" UNIQUE ("productId", "statDate")
);
CREATE INDEX IF NOT EXISTS "product_daily_date_idx" ON "productDailyStats" ("statDate");

