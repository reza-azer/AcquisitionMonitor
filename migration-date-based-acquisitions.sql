-- Migration: Add date-based acquisitions support
-- Run this in Supabase SQL Editor to update existing acquisitions table

-- 1. Add date column (if not exists)
ALTER TABLE acquisitions 
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- 2. Make week column nullable (for backward compatibility)
ALTER TABLE acquisitions 
ALTER COLUMN week DROP NOT NULL;

-- 3. Drop old unique constraint (member_id, week, product_key)
-- Note: You may need to find the actual constraint name first
-- Run: SELECT conname FROM pg_constraint WHERE conrelid = 'acquisitions'::regclass AND contype = 'u';
ALTER TABLE acquisitions DROP CONSTRAINT IF EXISTS acquisitions_member_id_week_product_key_key;

-- 4. Drop the week check constraint (too restrictive for date-based input)
ALTER TABLE acquisitions DROP CONSTRAINT IF EXISTS acquisitions_week_check;

-- 5. Add new unique constraint (member_id, date, product_key)
ALTER TABLE acquisitions 
ADD CONSTRAINT acquisitions_member_id_date_product_key_key UNIQUE(member_id, date, product_key);

-- 6. Create new indexes for date-based queries
CREATE INDEX IF NOT EXISTS idx_acquisitions_member_date ON acquisitions(member_id, date);
CREATE INDEX IF NOT EXISTS idx_acquisitions_date ON acquisitions(date);

-- 7. Migration: Populate date column for existing week-based records
-- This assumes week 1 starts from the first week of the current month
-- Adjust the reference date as needed for your use case
UPDATE acquisitions
SET date = DATE_TRUNC('month', CURRENT_DATE) + ((week - 1) * 7) * INTERVAL '1 day'
WHERE date IS NULL AND week IS NOT NULL;

-- 8. Add updated_at trigger to automatically update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_acquisitions_updated_at
BEFORE UPDATE ON acquisitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Verify the migration
-- SELECT COUNT(*) as total_records, 
--        COUNT(date) as records_with_date,
--        COUNT(week) as records_with_week
-- FROM acquisitions;
