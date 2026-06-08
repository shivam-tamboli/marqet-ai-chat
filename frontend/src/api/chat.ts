import type { Message, SessionMeta, CardPayload } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export interface SendMessageResponse {
  reply: string;
  sessionId: string;
  card?: CardPayload | null;
  card_payloads?: CardPayload[];
}

export async function sendMessage(
  message: string,
  sessionId?: string,
  customerId?: string
): Promise<SendMessageResponse> {
  const res = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId, customerId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  }

  return res.json();
}

export async function getHistory(sessionId: string): Promise<Message[]> {
  const res = await fetch(`${BASE}/chat/${sessionId}/messages`);
  if (!res.ok) return [];
  return res.json();
}

export async function deleteSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/chat/${sessionId}`, { method: 'DELETE' });
}

export async function getCustomerSessions(customerId: string): Promise<SessionMeta[]> {
  const res = await fetch(`${BASE}/chat/customer/${customerId}/sessions`);
  if (!res.ok) return [];
  return res.json();
}
