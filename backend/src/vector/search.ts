import { supabase } from '../db/supabase';
import { RAG } from '../lib/constants';

export async function searchFaqChunks(embedding: number[]): Promise<string[]> {
  const { data, error } = await supabase.rpc('match_faq_chunks', {
    query_embedding: embedding,
    match_count: RAG.TOP_K,
  });
  if (error) throw error;
  return (data as Array<{ content: string }>).map((r) => r.content);
}

// conversationId scopes retrieval to the active session so RAG memory
// does not bleed across independent conversations.
export async function searchMessageEmbeddings(
  embedding: number[],
  conversationId: string
): Promise<string[]> {
  const { data, error } = await supabase.rpc('match_message_embeddings', {
    query_embedding: embedding,
    match_count: RAG.TOP_K,
    filter_conversation_id: conversationId,
  });
  if (error) throw error;
  return (data as Array<{ text: string }>).map((r) => r.text);
}
