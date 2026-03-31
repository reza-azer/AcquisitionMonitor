-- Migration: Update weekly targets for CREDIT products to use nominal (Rupiah)
-- KSM: 36.000.000 (36jt)
-- KUM: 100.000.000 (100jt)
-- KUR: 100.000.000 (100jt)
-- KPR: 80.000.000 (80jt)

UPDATE products 
SET 
  weekly_target = 36000000,  -- 36jt
  unit = 'Rp',
  updated_at = NOW()
WHERE product_key = 'KSM';

UPDATE products 
SET 
  weekly_target = 100000000,  -- 100jt
  unit = 'Rp',
  updated_at = NOW()
WHERE product_key IN ('KUM', 'KUR');

UPDATE products 
SET 
  weekly_target = 80000000,  -- 80jt
  unit = 'Rp',
  updated_at = NOW()
WHERE product_key = 'KPR';

-- Verify the update
-- SELECT product_key, product_name, unit, weekly_target FROM products WHERE product_key IN ('KSM', 'KUM', 'KUR', 'KPR');
