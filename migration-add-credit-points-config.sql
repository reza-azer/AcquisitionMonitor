-- Migration: Add configurable points system for CREDIT products
-- Adds credit_nominal_per_point column to products table
-- This allows users to set how many millions (nominal) are needed for 1 point

-- Add new column with default value 100 (backward compatible: 1 poin per 100 juta)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS credit_nominal_per_point INTEGER DEFAULT 100;

-- Update existing CREDIT products to use 100 (current hardcoded value)
UPDATE products 
SET credit_nominal_per_point = 100 
WHERE category = 'CREDIT';

-- Add comment for documentation
COMMENT ON COLUMN products.credit_nominal_per_point IS 'For CREDIT products: how many millions (nominal) needed for 1 point. Example: 100 = 1 poin per 100 juta, 50 = 1 poin per 50 juta';

-- Verify the update
-- SELECT product_key, product_name, category, credit_nominal_per_point FROM products WHERE category = 'CREDIT';
