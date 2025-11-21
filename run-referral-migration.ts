import { getDb } from "./server/db";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log("🔌 Connecting to database...");
  const db = await getDb();
  if (!db) {
    console.error("❌ Failed to connect to database.");
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "update_referral_schema.sql");
  console.log(`📄 Reading SQL from ${sqlPath}...`);
  
  try {
    const sqlContent = fs.readFileSync(sqlPath, "utf-8");
    
    // Split by double newlines or comments to roughly separate blocks if needed, 
    // but Postgres can usually handle the whole block if it's valid SQL.
    // We'll send it as one command.
    
    // We need the raw client to execute raw SQL strings, drizzle instance might not expose a direct 'query' for raw text easily without 'sql' template tag wrapper.
    // Let's use the postgres client directly.
    const { getRawClient } = await import("./server/db");
    const sql = await getRawClient();
    
    if (!sql) {
        console.error("❌ Failed to get raw SQL client.");
        process.exit(1);
    }

    console.log("🚀 Executing migration script...");
    await sql.unsafe(sqlContent);
    
    console.log("✅ Migration applied successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error running migration:", error);
    process.exit(1);
  }
}

runMigration();

