CREATE TABLE "productDailyStats" (
	"id" serial NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial NOT NULL,
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
--> statement-breakpoint
CREATE INDEX "product_daily_date_idx" ON "productDailyStats" USING btree ("statDate");--> statement-breakpoint
CREATE INDEX "products_name_idx" ON "products" USING btree ("name");