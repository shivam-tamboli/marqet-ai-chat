-- Cosine similarity search over faq_chunks
create or replace function match_faq_chunks(
  query_embedding vector(1536),
  match_count      int default 3
)
returns table (
  id        uuid,
  content   text,
  metadata  jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from faq_chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Cosine similarity search over message_embeddings (joins messages for text)
create or replace function match_message_embeddings(
  query_embedding vector(1536),
  match_count      int default 3
)
returns table (
  id         uuid,
  message_id uuid,
  text       text,
  similarity float
)
language sql stable
as $$
  select
    me.id,
    me.message_id,
    m.text,
    1 - (me.embedding <=> query_embedding) as similarity
  from message_embeddings me
  join messages m on m.id = me.message_id
  order by me.embedding <=> query_embedding
  limit match_count;
$$;
