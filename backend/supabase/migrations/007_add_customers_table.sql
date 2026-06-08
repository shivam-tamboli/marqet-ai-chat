-- Migration 007: introduce customers entity and link existing data
--
-- Strategy: purely additive.
--   1. New customers table (id + name).
--   2. Nullable customer_id FK columns on orders and conversations.
--   3. Backfill customers from the distinct names already in orders.
--   4. Populate customer_id on orders from the new mapping.
--
-- customer_name columns are intentionally kept for backward compatibility.
-- All steps are idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING).

-- Step 1: customers lookup table
CREATE TABLE IF NOT EXISTS customers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Step 2: nullable FK on orders (old rows keep customer_id NULL until backfill)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Step 3: nullable FK on conversations (populated on new conversation creation)
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Step 4: backfill customers from existing order data
INSERT INTO customers (name)
  SELECT DISTINCT customer_name
  FROM orders
  WHERE customer_name IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Step 5: link existing orders to their customer rows
UPDATE orders o
SET customer_id = c.id
FROM customers c
WHERE o.customer_name = c.name
  AND o.customer_id IS NULL;
