-- Migration: Remove unique constraint to allow multiple CREDIT entries per day
-- This enables saving multiple acquisition entries for CREDIT products (KUM, KUR, KPR, KSM)
-- on the same date by the same member.

-- Drop the unique constraint on (member_id, date, product_key)
-- This constraint was preventing multiple entries for the same product on the same day
ALTER TABLE acquisitions 
DROP CONSTRAINT IF EXISTS acquisitions_member_id_date_product_key_key;

-- Create a regular (non-unique) index for query performance
-- This maintains good performance for lookups without enforcing uniqueness
CREATE INDEX IF NOT EXISTS idx_acquisitions_member_date_product 
ON acquisitions(member_id, date, product_key);

-- Add index for product_key lookups (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_acquisitions_product_key 
ON acquisitions(product_key);

-- Optional: Verify the constraint was dropped
-- SELECT conname FROM pg_constraint 
-- WHERE conname LIKE '%acquisitions_member_id_date_product_key%';
