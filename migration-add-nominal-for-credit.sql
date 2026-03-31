-- Migration: Add nominal column for CREDIT products
-- Run this in Supabase SQL Editor to add nominal tracking for credit acquisitions

-- Add nominal column (in millions)
ALTER TABLE acquisitions 
ADD COLUMN IF NOT EXISTS nominal INTEGER DEFAULT 0;

-- Add index for faster queries on nominal
CREATE INDEX IF NOT EXISTS idx_acquisitions_nominal ON acquisitions(nominal);

-- Add combined index for product_key and nominal queries
CREATE INDEX IF NOT EXISTS idx_acquisitions_product_nominal ON acquisitions(product_key, nominal);

-- Comment to document the purpose
COMMENT ON COLUMN acquisitions.nominal IS 'Nominal in millions for CREDIT category products (KUM, KUR, KPR, KSM). For FUNDING/TRANSACTION, this is 0.';

-- Verify the column was added
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'acquisitions' AND column_name = 'nominal';
