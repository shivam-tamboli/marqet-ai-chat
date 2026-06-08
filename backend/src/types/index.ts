export type { Database, OrderStatus, Sender } from './database';

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly code: 'rate_limit' | 'invalid_key' | 'timeout' | 'server_error' | 'network_error' | 'unknown'
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class DBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DBError';
  }
}

// Resolved customer record — set on req.activeCustomer by identity middleware.
export interface ActiveCustomer {
  id: string;    // DB UUID — the canonical customer identifier
  name: string;  // display name for LLM context — never logged, never sent over the wire
}

export interface ChatMessageRequest {
  message: string;
  sessionId?: string;
  customerId?: string;   // preferred: UUID from customers.id
  customerName?: string; // legacy fallback — still accepted, resolved server-side
}

export interface ChatMessageResponse {
  reply: string;
  sessionId: string;
  card?: CardPayload | null;
  card_payloads?: CardPayload[];
}

export interface CardPayload {
  type: 'order';
  order_number: string;
  status: string;
  customer_name: string;
  items: unknown[];
}
