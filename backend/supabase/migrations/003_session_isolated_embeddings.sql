-- Update match_message_embeddings to filter by conversation_id so RAG
-- memory does not bleed across sessions.
create or replace function match_message_embeddings(
  query_embedding  vector(1536),
  match_count      int default 3,
  filter_conversation_id uuid default null
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
  where
    filter_conversation_id is null
    or m.conversation_id = filter_conversation_id
  order by me.embedding <=> query_embedding
  limit match_count;
$$;
