-- Migration: Add sort_order column to products table
-- Enables manual drag-and-drop ordering of products in the Product Manager

ALTER TABLE products
ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Initialize sort_order based on existing data (by category then created_at)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY category, created_at) AS rn
  FROM products
)
UPDATE products p
SET sort_order = r.rn
FROM ranked r
WHERE p.id = r.id;

-- Create index for sorting performance
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON products(sort_order);
