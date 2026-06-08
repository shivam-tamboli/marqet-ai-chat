import { supabase } from './supabase';
import type { Database, OrderStatus } from '../types/database';
import { DBError } from '../types';
import { logError } from '../lib/logger';

type ConversationRow = Database['public']['Tables']['conversations']['Row'];
type MessageRow = Database['public']['Tables']['messages']['Row'];
type OrderRow = Database['public']['Tables']['orders']['Row'];
export type CustomerRow = Database['public']['Tables']['customers']['Row'];

function dbError(op: string, err: unknown): never {
  logError({ event: 'db.error', op, error: err });
  throw new DBError(`Database error during ${op}.`);
}

// Module-level caches for the customers table.
// Effectively static during server lifetime — 5 rows, never updated. No TTL needed.
const customerIdCache = new Map<string, CustomerRow>();
const customerNameCache = new Map<string, CustomerRow>();

export async function getCustomerById(id: string): Promise<CustomerRow | null> {
  const key = id.toLowerCase().trim();
  const cached = customerIdCache.get(key);
  if (cached) return cached;
  const { data, error } = await supabase
    .from('customers')
    .select()
    .eq('id', id)
    .maybeSingle();
  if (error) dbError('getCustomerById', error);
  if (data) {
    const row = data as unknown as CustomerRow;
    customerIdCache.set(key, row);
    customerNameCache.set(row.name.toLowerCase().trim(), row);
  }
  return data as unknown as CustomerRow | null;
}

export async function getCustomerByName(name: string): Promise<CustomerRow | null> {
  const key = name.toLowerCase().trim();
  const cached = customerNameCache.get(key);
  if (cached) return cached;
  const { data, error } = await supabase
    .from('customers')
    .select()
    .eq('name', name)
    .maybeSingle();
  if (error) dbError('getCustomerByName', error);
  if (data) {
    const row = data as unknown as CustomerRow;
    customerNameCache.set(key, row);
    customerIdCache.set(row.id, row);
  }
  return data as unknown as CustomerRow | null;
}

export async function createConversation(customerId?: string): Promise<ConversationRow> {
  const payload = customerId ? { customer_id: customerId } : {};
  const { data, error } = await supabase
    .from('conversations')
    .insert(payload as never)
    .select()
    .single();
  if (error) dbError('createConversation', error);
  return data as unknown as ConversationRow;
}

export async function getConversation(id: string): Promise<ConversationRow | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select()
    .eq('id', id)
    .maybeSingle();
  if (error) dbError('getConversation', error);
  return data as unknown as ConversationRow | null;
}

export async function saveMessage(
  conversationId: string,
  sender: 'user' | 'ai',
  text: string,
  cardPayload?: Record<string, unknown> | null,
  cardPayloads?: Record<string, unknown>[] | null
): Promise<MessageRow> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender,
      text,
      card_payload: cardPayload ?? null,
      card_payloads: cardPayloads ?? null,
    } as never)
    .select()
    .single();
  if (error) dbError('saveMessage', error);
  return data as unknown as MessageRow;
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select()
    .eq('conversation_id', conversationId)
    .order('timestamp', { ascending: true });
  if (error) dbError('getMessages', error);
  return (data ?? []) as unknown as MessageRow[];
}

// Order identifier convention:
//   order_number (e.g. "MQ-1001") — user-facing; used in chat messages, URL params,
//                                    Realtime filters, and all customer-visible context.
//   id (UUID)                      — internal primary key; used only for FK joins
//                                    (e.g. message.conversation_id) and DB-level deletes.
// Never use id for user-facing lookups or Realtime filters; never use order_number for joins.

export async function getOrderByNumber(orderNumber: string): Promise<OrderRow | null> {
  const { data, error } = await supabase
    .from('orders')
    .select()
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (error) dbError('getOrderByNumber', error);
  return data as unknown as OrderRow | null;
}

export async function advanceOrderStatus(orderNumber: string): Promise<OrderRow | null> {
  const order = await getOrderByNumber(orderNumber);
  if (!order) return null;

  const progression: OrderStatus[] = ['Paid', 'Packed', 'Shipped', 'Delivered'];
  const currentIndex = progression.indexOf(order.status);
  if (currentIndex === -1 || currentIndex === progression.length - 1) return order;

  const nextStatus = progression[currentIndex + 1];
  const { data, error } = await supabase
    .from('orders')
    .update({ status: nextStatus, updated_at: new Date().toISOString() } as never)
    .eq('order_number', orderNumber)
    .select()
    .single();
  if (error) dbError('advanceOrderStatus', error);
  return data as unknown as OrderRow;
}

export async function getOrdersByCustomerName(customerName: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select()
    .eq('customer_name', customerName)
    .order('updated_at', { ascending: false });
  if (error) dbError('getOrdersByCustomerName', error);
  return (data ?? []) as unknown as OrderRow[];
}

export async function getOrdersByCustomerId(customerId: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select()
    .eq('customer_id', customerId)
    .order('updated_at', { ascending: false });
  if (error) dbError('getOrdersByCustomerId', error);
  return (data ?? []) as unknown as OrderRow[];
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { data: msgs } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId);

  if (msgs && msgs.length > 0) {
    const ids = (msgs as { id: string }[]).map((m) => m.id);
    const { error: embErr } = await supabase
      .from('message_embeddings')
      .delete()
      .in('message_id', ids);
    if (embErr) dbError('deleteConversation.embeddings', embErr);
  }

  const { error: msgErr } = await supabase
    .from('messages')
    .delete()
    .eq('conversation_id', conversationId);
  if (msgErr) dbError('deleteConversation.messages', msgErr);

  const { error: convErr } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);
  if (convErr) dbError('deleteConversation.conversations', convErr);
}

export async function saveMessageEmbedding(
  messageId: string,
  embedding: number[]
): Promise<void> {
  const { error } = await supabase
    .from('message_embeddings')
    .insert({ message_id: messageId, embedding } as never);
  if (error) dbError('saveMessageEmbedding', error);
}
