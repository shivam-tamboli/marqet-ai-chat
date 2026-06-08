-- Migration 010: remove slug column and name unique constraint
--
-- The slug was a workaround so the frontend could send a stable short string
-- instead of a UUID. We now send the UUID directly, so the slug column is
-- no longer needed. The name column unique constraint is also dropped because
-- customer names are not guaranteed to be unique.

-- Drop the slug index and column (also drops the UNIQUE constraint on slug)
DROP INDEX IF EXISTS customers_slug_idx;
ALTER TABLE customers DROP COLUMN IF EXISTS slug;

-- Drop unique constraint on name
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_name_key;
