export type Sender = 'user' | 'ai';

export interface CardPayload {
  type: 'order';
  order_number: string;
  status: string;
  customer_name: string;
  items: unknown[];
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  card_payload?: CardPayload | null;
  card_payloads?: CardPayload[];
  timestamp: string;
  status?: 'failed';
  errorMessage?: string;
}

export interface SessionMeta {
  id: string;
  firstMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  order_number: string;
  status: 'Paid' | 'Packed' | 'Shipped' | 'Delivered';
  customer_name: string;
  items: unknown[];
  updated_at: string;
}
