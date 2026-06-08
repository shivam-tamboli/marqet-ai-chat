// Pure helper functions used by chat.service.ts.
// Kept in a separate module so they can be unit-tested without requiring
// the Supabase or OpenAI clients to be initialised.

export const ORDER_RE = /\bMQ-\d{4,}\b/gi;

export const ORDER_LIST_PATTERNS = [
  /\bmy\s+orders?\b/i,
  /\ball\s+my\s+orders?\b/i,
  /\blist\s+my\s+orders?\b/i,
  /\bshow\s+(me\s+)?my\s+orders?\b/i,
  /\bwhat\s+did\s+i\s+(order|buy|purchase)\b/i,
  /\bwhat\s+have\s+i\s+(ordered|bought|purchased)\b/i,
  /\bmy\s+purchases?\b/i,
  /\bmy\s+recent\s+(orders?|purchases?)\b/i,
  /\b(things|items)\s+i\s+(ordered|bought)\b/i,
  /\borders?\s+on\s+my\s+account\b/i,
  /\bwhat'?s?\s+in\s+my\s+orders?\b/i,
  /\bshow\s+(me\s+)?what\s+i\s+(ordered|bought|purchased)\b/i,
];

export function isOrderListIntent(message: string): boolean {
  return ORDER_LIST_PATTERNS.some((re) => re.test(message));
}

// Detects phrases like "my name is X", "I am X", "I'm X", "this is X", "call me X".
// Requires the captured name to start with a capital letter to avoid false positives
// on phrases like "I'm fine" or "I am a customer".
export function detectIdentityClaim(message: string): string | null {
  const patterns = [
    /\bmy\s+name\s+is\s+([A-Za-z][\w ]{2,})/i,
    // [Ii] matches both "I" and "i" without using the /i flag, which would also
    // make [A-Z] case-insensitive and cause false positives like "I am a customer".
    /\b[Ii]\s*(?:am|'m)\s+([A-Z][\w ]{2,})/,
    /\b[Tt]his\s+is\s+([A-Z][\w ]{2,})/,
    /\bcall\s+me\s+([A-Za-z][\w ]{2,})/i,
  ];
  for (const re of patterns) {
    const match = message.match(re);
    if (match) {
      const name = match[1].trim().split(/\s+/).slice(0, 3).join(' ').replace(/[.,!?]+$/, '');
      if (name.length >= 3) return name;
    }
  }
  return null;
}

// Returns true when the order belongs to the requesting customer, or when there
// is no customer context (unauthenticated / support agent view — no restriction).
//
// Ownership resolution priority:
//   1. UUID comparison — when both the order and the session have a customer_id.
//      Immune to name typos and case differences.
//   2. Name comparison — fallback for orders that pre-date migration 007 (customer_id IS NULL)
//      or for sessions where the customer UUID could not be resolved.
export function customerOwns(
  order: { customer_name: string; customer_id?: string | null },
  customerName?: string,
  customerId?: string | null
): boolean {
  if (!customerName) return true; // no session context — open access
  if (customerId && order.customer_id) {
    return order.customer_id === customerId;
  }
  return order.customer_name.toLowerCase().trim() === customerName.toLowerCase().trim();
}

export function formatItems(items: unknown[]): string {
  if (!items || items.length === 0) return '';
  return items
    .map((item) => {
      const i = item as { name?: string; size?: string; qty?: number };
      const name = i.name ?? 'Unknown item';
      const size = i.size ? ` (size ${i.size})` : '';
      const qty = i.qty && i.qty > 1 ? ` × ${i.qty}` : '';
      return `${name}${size}${qty}`;
    })
    .join(', ');
}

export function formatOrderDate(updatedAt: string): string {
  const d = new Date(updatedAt);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function orderDetailLine(order: {
  order_number: string;
  status: string;
  items: unknown[];
  updated_at: string;
}): string {
  const items = formatItems(order.items);
  const date = formatOrderDate(order.updated_at);
  const delivery =
    order.status === 'Shipped' ? ' Estimated delivery in 3–5 business days.' : '';
  return (
    `order ${order.order_number}: status ${order.status}, ` +
    `items: ${items || 'not specified'}, ` +
    `last updated ${date}.${delivery}`
  );
}
