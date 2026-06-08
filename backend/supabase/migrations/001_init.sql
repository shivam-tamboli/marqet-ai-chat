-- Enable pgvector extension (pre-available on Supabase)
create extension if not exists vector;

-- ─── conversations ────────────────────────────────────────────────────────────
create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  metadata    jsonb
);

-- ─── messages ─────────────────────────────────────────────────────────────────
create table if not exists messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender           text not null check (sender in ('user', 'ai')),
  text             text not null,
  card_payload     jsonb,
  timestamp        timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx
  on messages (conversation_id, timestamp);

-- ─── orders ───────────────────────────────────────────────────────────────────
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null unique,
  status         text not null check (status in ('Paid', 'Provisioning', 'Activated', 'Live')),
  customer_name  text not null,
  items          jsonb not null default '[]',
  updated_at     timestamptz not null default now()
);

-- ─── faq_chunks ───────────────────────────────────────────────────────────────
create table if not exists faq_chunks (
  id         uuid primary key default gen_random_uuid(),
  content    text not null,
  embedding  vector(1536),
  metadata   jsonb
);

create index if not exists faq_chunks_embedding_idx
  on faq_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- ─── message_embeddings ───────────────────────────────────────────────────────
create table if not exists message_embeddings (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references messages(id) on delete cascade,
  embedding   vector(1536)
);

create index if not exists message_embeddings_embedding_idx
  on message_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- ─── Supabase Realtime: publish order row changes ─────────────────────────────
-- Run only if orders is not already in the publication:
-- alter publication supabase_realtime add table orders;
