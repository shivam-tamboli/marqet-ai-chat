-- Migration 009: add stable slug column to customers for API identity
--
-- Slug = first name, lowercased (e.g. "Priya Sharma" → "priya").
-- Matches the id values already used in frontend/src/data/customers.ts
-- so the frontend can send customerId: customer.id without any lookup.
--
-- Steps:
--   1. Add nullable slug column with a unique constraint.
--   2. Backfill from existing names.
--   3. Tighten to NOT NULL.
--   4. Index for O(log n) lookup in getCustomerBySlug().

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS slug text UNIQUE;

UPDATE customers
  SET slug = lower(split_part(name, ' ', 1))
  WHERE slug IS NULL;

ALTER TABLE customers
  ALTER COLUMN slug SET NOT NULL;

CREATE INDEX IF NOT EXISTS customers_slug_idx ON customers (slug);
