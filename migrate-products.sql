-- Create products table
CREATE TABLE IF NOT EXISTS "products" (
"id" serial PRIMARY KEY,
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
CONSTRAINT "products_name_unique" UNIQUE("name")
);

-- Create productDailyStats table
CREATE TABLE IF NOT EXISTS "productDailyStats" (
"id" serial PRIMARY KEY,
"productId" integer NOT NULL,
"statDate" date NOT NULL,
"salesVolumeGrams" integer DEFAULT 0 NOT NULL,
"orderCount" integer DEFAULT 0 NOT NULL,
"revenueCents" integer DEFAULT 0 NOT NULL,
"totalPoints" integer DEFAULT 0 NOT NULL,
"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
CONSTRAINT "product_daily_unique" UNIQUE("productId","statDate")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "products_name_idx" ON "products" USING btree ("name");
CREATE INDEX IF NOT EXISTS "product_daily_date_idx" ON "productDailyStats" USING btree ("statDate");

-- Mark migration as applied in drizzle migrations table
INSERT INTO "__drizzle_migrations" (hash, created_at) 
VALUES ('0002_yielding_colossus', EXTRACT(EPOCH FROM NOW()) * 1000)
ON CONFLICT (hash) DO NOTHING;
