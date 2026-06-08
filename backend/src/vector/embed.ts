import OpenAI from 'openai';
import { LLMError } from '../types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 429) throw new LLMError('Rate limit reached. Please try again shortly.', 'rate_limit');
    if (e.status === 401) throw new LLMError('LLM service authentication failed.', 'invalid_key');
    throw new LLMError('Failed to generate embedding.', 'unknown');
  }
}
