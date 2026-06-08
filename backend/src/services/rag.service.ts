import { embedText } from '../vector/embed';
import { searchFaqChunks, searchMessageEmbeddings } from '../vector/search';
import { saveMessageEmbedding } from '../db/queries';

export interface RetrievedContext {
  chunks: string[];
  faqCount: number;
  memoryCount: number;
}

export async function retrieveContext(
  userMessage: string,
  conversationId: string
): Promise<RetrievedContext> {
  const embedding = await embedText(userMessage);
  const [faqChunks, messageChunks] = await Promise.all([
    searchFaqChunks(embedding),
    searchMessageEmbeddings(embedding, conversationId),
  ]);
  return {
    chunks: [...faqChunks, ...messageChunks],
    faqCount: faqChunks.length,
    memoryCount: messageChunks.length,
  };
}

export async function storeMessageEmbedding(
  messageId: string,
  text: string
): Promise<void> {
  const embedding = await embedText(text);
  await saveMessageEmbedding(messageId, embedding);
}
