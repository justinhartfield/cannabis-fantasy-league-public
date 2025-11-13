-- Migration: Add syncJobs and syncLogs tables for admin dashboard
-- Created: 2025-11-13

CREATE TABLE IF NOT EXISTS "syncJobs" (
  "id" SERIAL PRIMARY KEY,
  "job_name" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) DEFAULT 'pending' NOT NULL,
  "details" TEXT,
  "started_at" TIMESTAMP WITH TIME ZONE,
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "processed_count" INTEGER DEFAULT 0,
  "total_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sync_jobs_status_idx" ON "syncJobs" ("status");
CREATE INDEX IF NOT EXISTS "sync_jobs_created_at_idx" ON "syncJobs" ("created_at");

CREATE TABLE IF NOT EXISTS "syncLogs" (
  "id" SERIAL PRIMARY KEY,
  "job_id" INTEGER NOT NULL REFERENCES "syncJobs"("id"),
  "level" VARCHAR(50) NOT NULL,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sync_logs_job_id_idx" ON "syncLogs" ("job_id");
CREATE INDEX IF NOT EXISTS "sync_logs_timestamp_idx" ON "syncLogs" ("timestamp");
