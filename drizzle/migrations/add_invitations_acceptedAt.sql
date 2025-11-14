-- Add acceptedAt column to invitations table if it doesn't exist
ALTER TABLE "invitations" 
ADD COLUMN IF NOT EXISTS "acceptedAt" timestamp with time zone;
