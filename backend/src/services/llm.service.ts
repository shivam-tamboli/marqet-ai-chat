import OpenAI from 'openai';
import { LLMError } from '../types';
import { buildSystemPrompt } from '../prompts/system';
import { retrieveContext } from './rag.service';
import { logError, noopLogger, RequestLogger } from '../lib/logger';
import { LLM } from '../lib/constants';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GenerateReplyResult {
  reply: string;
}

type MessageRow = { sender: string; text: string };

export async function generateReply(
  history: MessageRow[],
  userMessage: string,
  conversationId: string,
  orderContext?: string,
  log: RequestLogger = noopLogger
): Promise<GenerateReplyResult> {
  const { chunks: ragContext, faqCount, memoryCount } = await retrieveContext(userMessage, conversationId);
  log.log('rag.faq',    { chunks: faqCount });
  log.log('rag.memory', { chunks: memoryCount });

  const systemPrompt = buildSystemPrompt(ragContext, orderContext);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-LLM.HISTORY_WINDOW).map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    })),
    { role: 'user', content: userMessage },
  ];

  // Rough token estimate: 1 token ≈ 4 chars
  const inputApproxTokens = Math.round(
    (systemPrompt.length + messages.slice(1).reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : 0), 0)) / 4
  );
  log.log('llm.call', { model: LLM.MODEL, inputApproxTokens });

  let reply: string;
  const t0 = Date.now();
  try {
    const completion = await openai.chat.completions.create({
      model: LLM.MODEL,
      messages,
      max_tokens: LLM.MAX_TOKENS,
      temperature: LLM.TEMPERATURE,
    });
    const latency = Date.now() - t0;
    reply = completion.choices[0]?.message?.content?.trim() ?? 'Sorry, I could not generate a response.';
    const outputApproxTokens = Math.round(reply.length / 4);
    log.log('llm.response', { outputApproxTokens, latency: `${latency}ms` });
  } catch (err: unknown) {
    const e = err as { status?: number; code?: string; message?: string };

    if (e.status === 429) {
      logError({ event: 'llm.error', code: 'rate_limit', conversationId, error: err });
      log.error('llm.error', { code: 'rate_limit' });
      throw new LLMError("I'm receiving too many requests right now. Please try again in a moment.", 'rate_limit');
    }
    if (e.status === 401) {
      logError({ event: 'llm.error', code: 'invalid_key', conversationId, error: err });
      log.error('llm.error', { code: 'invalid_key' });
      throw new LLMError('LLM service is temporarily unavailable.', 'invalid_key');
    }
    if (e.code === 'ETIMEDOUT' || e.code === 'ECONNABORTED' || e.code === 'UND_ERR_CONNECT_TIMEOUT') {
      logError({ event: 'llm.error', code: 'timeout', conversationId, error: err });
      log.error('llm.error', { code: 'timeout' });
      throw new LLMError('The request timed out. Please try again.', 'timeout');
    }
    if (e.code === 'ECONNREFUSED' || e.code === 'ENOTFOUND' || e.code === 'ECONNRESET') {
      logError({ event: 'llm.error', code: 'network_error', conversationId, error: err });
      log.error('llm.error', { code: 'network_error' });
      throw new LLMError('Unable to reach the AI service. Please check your connection and try again.', 'network_error');
    }
    if (e.status !== undefined && e.status >= 500) {
      logError({ event: 'llm.error', code: 'server_error', conversationId, error: err });
      log.error('llm.error', { code: 'server_error' });
      throw new LLMError('The AI service is temporarily unavailable. Please try again shortly.', 'server_error');
    }
    logError({ event: 'llm.error', code: 'unknown', conversationId, error: err });
    log.error('llm.error', { code: 'unknown' });
    throw new LLMError('Something went wrong. Please try again.', 'unknown');
  }

  return { reply };
}
