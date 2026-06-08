-- Migration 008: NOT NULL constraints on embedding columns + customer lookup indexes

-- Remove any NULL-embedding rows before tightening the constraint.
-- Such rows are invisible to cosine similarity anyway; deleting them is safe.
DELETE FROM faq_chunks        WHERE embedding IS NULL;
DELETE FROM message_embeddings WHERE embedding IS NULL;

-- Enforce NOT NULL so future inserts without an embedding fail fast at the DB level.
ALTER TABLE faq_chunks         ALTER COLUMN embedding SET NOT NULL;
ALTER TABLE message_embeddings ALTER COLUMN embedding SET NOT NULL;

-- B-tree indexes for customer-based order and conversation lookups.
CREATE INDEX IF NOT EXISTS orders_customer_name_idx      ON orders        (customer_name);
CREATE INDEX IF NOT EXISTS orders_customer_id_idx        ON orders        (customer_id);
CREATE INDEX IF NOT EXISTS conversations_customer_id_idx ON conversations (customer_id);
