import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// Append sslmode=require if not already present (needed for Render PostgreSQL)
const connectionStringWithSSL = connectionString.includes('sslmode=')
  ? connectionString
  : `${connectionString}${connectionString.includes('?') ? '&' : '?'}sslmode=require`;

export default defineConfig({
  schema: ["./drizzle/schema.ts", "./drizzle/publicModeSchema.ts", "./drizzle/stockMarketSchema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionStringWithSSL,
  },
});
