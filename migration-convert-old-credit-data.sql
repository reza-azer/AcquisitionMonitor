-- Migration: Convert old CREDIT data to new format
-- This converts data from old format (quantity=X, nominal=0) to new format (quantity=1, nominal=X*1000000)
-- Run this AFTER migration-remove-unique-constraint.sql

-- Convert old CREDIT entries where nominal is 0 but quantity has the juta value
-- Example: quantity=400, nominal=0 → quantity=1, nominal=400000000
UPDATE acquisitions 
SET 
  quantity = 1, 
  nominal = quantity * 1000000,
  updated_at = NOW()
WHERE 
  product_key IN ('KPR', 'KSM', 'KUM', 'KUR')
  AND nominal = 0 
  AND quantity > 0;

-- Update product points configuration for CREDIT products
-- 1 poin per 100 juta (flat_points = 1, divisor = 100.000.000)
UPDATE products 
SET 
  flat_points = 1,
  unit = 'Rp',
  updated_at = NOW()
WHERE product_key IN ('KPR', 'KSM', 'KUM', 'KUR');

-- Verify the migration
-- SELECT product_key, COUNT(*) as count, SUM(nominal) as total_nominal, AVG(quantity) as avg_quantity
-- FROM acquisitions
-- WHERE product_key IN ('KPR', 'KSM', 'KUM', 'KUR')
-- GROUP BY product_key;

-- Verify products configuration
-- SELECT product_key, product_name, unit, flat_points FROM products WHERE product_key IN ('KPR', 'KSM', 'KUM', 'KUR');
