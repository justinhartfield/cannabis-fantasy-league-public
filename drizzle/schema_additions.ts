// Add these table definitions to drizzle/schema.ts

// Products table - tracks individual cannabis product SKUs
export const products = pgTable("products", {
	id: serial().notNull(),
	name: varchar({ length: 500 }).notNull(), // e.g., "Pedanios 26/1 EHD-CA"
	slug: varchar({ length: 500 }),
	manufacturerId: integer(), // Link to manufacturer
	brandId: integer(), // Link to brand if applicable
	strainId: integer(), // Link to strain if applicable
	thcPercentage: varchar({ length: 50 }), // e.g., "26"
	cbdPercentage: varchar({ length: 50 }), // e.g., "1"
	productCode: varchar({ length: 100 }), // e.g., "EHD-CA"
	imageUrl: varchar({ length: 500 }),
	description: text(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("products_name_idx").on(table.name),
	unique("products_name_unique").on(table.name),
]);

// Product Daily Stats - tracks daily sales/order metrics
export const productDailyStats = pgTable("productDailyStats", {
	id: serial().notNull(),
	productId: integer().notNull(),
	statDate: date({ mode: 'string' }).notNull(),
	salesVolumeGrams: integer().default(0).notNull(),
	orderCount: integer().default(0).notNull(),
	revenueCents: integer().default(0).notNull(),
	totalPoints: integer().default(0).notNull(),
	createdAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ mode: 'string', withTimezone: true }).defaultNow().notNull(),
},
(table) => [
	index("product_daily_date_idx").on(table.statDate),
	unique("product_daily_unique").on(table.productId, table.statDate),
]);
