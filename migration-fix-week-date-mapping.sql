-- Migration: Fix Week/Date Mapping for Legacy Data
-- Run this in Supabase SQL Editor to fix data input before the calendar update
-- 
-- Background:
-- - Old system: Data input via week selector (Week 1-4) without specific dates
-- - New system: Calendar-based input with specific dates
-- - Issue: Old data has incorrect date mappings, causing dashboard display issues
--
-- This migration:
-- 1. Moves Week 1 data to day 7 of the current month
-- 2. Moves Week 2 data to day 14 of the current month
-- 3. Moves Week 3 data to day 21 of the current month
-- 4. Moves Week 4 data to day 28 of the current month
-- 5. Recalculates week numbers based on the actual date for all records
-- 6. Ensures updated_at is properly set
-- 7. Handles duplicates by keeping the most recently updated record

-- Step 1: Ensure updated_at column exists and is properly indexed
ALTER TABLE acquisitions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- Step 2: Create updated_at trigger if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_acquisitions_updated_at ON acquisitions;
CREATE TRIGGER update_acquisitions_updated_at
BEFORE UPDATE ON acquisitions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 3: Handle duplicates BEFORE date mapping
-- For duplicates (same member_id, week, product_key), keep only the most recently updated one
-- First, create a temp table with duplicates to audit them

CREATE TEMP TABLE duplicates_to_remove AS
WITH ranked AS (
  SELECT 
    id,
    member_id,
    week,
    product_key,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY member_id, week, product_key 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM acquisitions
  WHERE week IS NOT NULL
)
SELECT id, member_id, week, product_key, updated_at
FROM ranked
WHERE rn > 1;

-- Log how many duplicates we found
DO $$
DECLARE
  dup_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM duplicates_to_remove;
  RAISE NOTICE 'Found % duplicate records to remove', dup_count;
END $$;

-- Delete duplicates (keep the most recent)
DELETE FROM acquisitions
WHERE id IN (SELECT id FROM duplicates_to_remove);

-- Step 4: Map old week-based data to specific dates
-- Week 1 -> Day 7, Week 2 -> Day 14, Week 3 -> Day 21, Week 4 -> Day 28
-- Only update records where date is NULL or was auto-generated (not manually set)

-- Update Week 1 data to day 7
UPDATE acquisitions
SET date = DATE_TRUNC('month', COALESCE(updated_at, created_at, CURRENT_DATE)) + INTERVAL '6 days'
WHERE week = 1 AND (date IS NULL OR date = created_at::date);

-- Update Week 2 data to day 14
UPDATE acquisitions
SET date = DATE_TRUNC('month', COALESCE(updated_at, created_at, CURRENT_DATE)) + INTERVAL '13 days'
WHERE week = 2 AND (date IS NULL OR date = created_at::date);

-- Update Week 3 data to day 21
UPDATE acquisitions
SET date = DATE_TRUNC('month', COALESCE(updated_at, created_at, CURRENT_DATE)) + INTERVAL '20 days'
WHERE week = 3 AND (date IS NULL OR date = created_at::date);

-- Update Week 4 data to day 28
UPDATE acquisitions
SET date = DATE_TRUNC('month', COALESCE(updated_at, created_at, CURRENT_DATE)) + INTERVAL '27 days'
WHERE week = 4 AND (date IS NULL OR date = created_at::date);

-- Step 5: Recalculate week numbers based on the actual date for ALL records
-- This ensures consistency: week is always derived from the date
-- Week calculation: Week 1 = days 1-7, Week 2 = days 8-14, Week 3 = days 15-21, Week 4 = days 22-31

UPDATE acquisitions
SET week = CEIL(EXTRACT(DAY FROM date) / 7.0)::INTEGER
WHERE date IS NOT NULL;

-- Ensure week is between 1 and 4 (cap at 4 for days 29-31)
UPDATE acquisitions
SET week = 4
WHERE week > 4 OR week IS NULL;

-- Step 6: Add check constraint to ensure week is always 1-4 (optional, for data integrity)
ALTER TABLE acquisitions DROP CONSTRAINT IF EXISTS acquisitions_week_check;
ALTER TABLE acquisitions 
ADD CONSTRAINT acquisitions_week_check 
CHECK (week >= 1 AND week <= 4);

-- Step 7: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_acquisitions_member_date ON acquisitions(member_id, date);
CREATE INDEX IF NOT EXISTS idx_acquisitions_date ON acquisitions(date);
CREATE INDEX IF NOT EXISTS idx_acquisitions_member_week ON acquisitions(member_id, week);
CREATE INDEX IF NOT EXISTS idx_acquisitions_updated_at ON acquisitions(updated_at DESC);

-- Clean up temp table
DROP TABLE IF EXISTS duplicates_to_remove;

-- Verification queries (uncomment to run)
-- SELECT COUNT(*) as total, 
--        COUNT(DISTINCT week) as weeks_with_data,
--        COUNT(DISTINCT date) as unique_dates,
--        MIN(date) as earliest_date,
--        MAX(date) as latest_date
-- FROM acquisitions;

-- SELECT week, COUNT(*) as count, MIN(date) as min_date, MAX(date) as max_date
-- FROM acquisitions
-- GROUP BY week
-- ORDER BY week;

-- SELECT 
--   DATE_TRUNC('month', date) as month,
--   COUNT(*) as total_records,
--   COUNT(DISTINCT member_id) as unique_members,
--   COUNT(DISTINCT product_key) as unique_products
-- FROM acquisitions
-- GROUP BY DATE_TRUNC('month', date)
-- ORDER BY month;
