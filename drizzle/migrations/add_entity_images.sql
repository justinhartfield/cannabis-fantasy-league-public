-- Add image URL columns to entity tables
-- Run this migration to add logoUrl/imageUrl columns for visual assets

-- Add logoUrl to manufacturers table
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Add logoUrl to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Add logoUrl to pharmacies table
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Add imageUrl to cannabisStrains table
ALTER TABLE "cannabisStrains" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "manufacturer_logo_idx" ON manufacturers("logoUrl");
CREATE INDEX IF NOT EXISTS "brand_logo_idx" ON brands("logoUrl");
CREATE INDEX IF NOT EXISTS "pharmacy_logo_idx" ON pharmacies("logoUrl");
CREATE INDEX IF NOT EXISTS "strain_image_idx" ON "cannabisStrains"("imageUrl");

-- Success message
SELECT 'Image URL columns added successfully!' as status;
