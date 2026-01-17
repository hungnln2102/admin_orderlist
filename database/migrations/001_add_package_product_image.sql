-- Migration: Add image_url column to product table
-- Date: 2026-01-17

ALTER TABLE product.product 
ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMENT ON COLUMN product.product.image_url IS 'URL of the product image';
