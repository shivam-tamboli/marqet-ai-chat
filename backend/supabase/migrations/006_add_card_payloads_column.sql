-- Adds card_payloads (plural) to messages so that multi-card AI replies
-- (e.g. two order cards in one message) survive page reload and session restore.
-- The existing card_payload column stays for single-card compat and history queries
-- that only need the first card; card_payloads stores the full array when > 1 card.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS card_payloads jsonb;
