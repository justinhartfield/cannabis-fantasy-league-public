#!/bin/bash
# Migration script to add image URL columns to database
# Safe to run multiple times (uses IF NOT EXISTS)

echo "🎨 Adding image URL columns to database..."

psql $DATABASE_URL << 'EOF'
-- Add image URL columns to entity tables
ALTER TABLE manufacturers ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "cannabisStrains" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "manufacturer_logo_idx" ON manufacturers("logoUrl");
CREATE INDEX IF NOT EXISTS "brand_logo_idx" ON brands("logoUrl");
CREATE INDEX IF NOT EXISTS "pharmacy_logo_idx" ON pharmacies("logoUrl");
CREATE INDEX IF NOT EXISTS "strain_image_idx" ON "cannabisStrains"("imageUrl");

-- Success message
SELECT '✅ Image URL columns added successfully!' as status;
EOF

echo "✅ Migration complete!"
