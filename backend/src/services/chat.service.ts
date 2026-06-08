import {
  createConversation,
  getConversation,
  saveMessage,
  getMessages,
  getOrderByNumber,
  getOrdersByCustomerId,
  deleteConversation,
} from '../db/queries';
import { generateReply } from './llm.service';
import { storeMessageEmbedding } from './rag.service';
import { log, logError, noopLogger, RequestLogger } from '../lib/logger';
import { CONTEXT_TAGS } from '../lib/constants';
import type { ActiveCustomer } from '../types';
import {
  ORDER_RE,
  isOrderListIntent,
  detectIdentityClaim,
  customerOwns,
  formatItems,
  orderDetailLine,
} from '../lib/chatHelpers';
import type { ChatMessageResponse, CardPayload } from '../types';

// Re-export pure helpers so callers (tests, other services) can import them
// without pulling in the DB/LLM client initialization that chat.service.ts triggers.
export { detectIdentityClaim, customerOwns };

function hasOrderSignals(message: string): boolean {
  const m = message.toLowerCase();
  // ORDER_RE has the /g flag so .test() advances lastIndex. Reset after use.
  const hasRef = ORDER_RE.test(message);
  ORDER_RE.lastIndex = 0;
  return (
    hasRef ||
    /\bmy\s+(orders?|purchases?|items?|delivery|shipment)\b/.test(m) ||
    /\b(what|where|when)\s+did\s+i\s+(order|buy|purchase)\b/.test(m) ||
    /\bwhat\s+have\s+i\s+(ordered|bought|purchased)\b/.test(m) ||
    /\b(track|trace|status|tracking)\b/.test(m) ||
    /\b(refund|return|cancel)\b/.test(m) ||
    /\b(deliver(ed|y)?|shipped|packed|paid)\b/.test(m) ||
    /\b(my\s+products?|things\s+i\s+ordered|items\s+i\s+bought)\b/.test(m)
  );
}

function toCard(order: {
  order_number: string;
  status: string;
  customer_name: string;
  items: unknown[];
}): CardPayload {
  return {
    type: 'order',
    order_number: order.order_number,
    status: order.status,
    customer_name: order.customer_name,
    items: order.items,
  };
}

export async function handleChatMessage(
  message: string,
  sessionId?: string,
  activeCustomer?: ActiveCustomer | null,
  reqLog: RequestLogger = noopLogger
): Promise<ChatMessageResponse> {
  const customerId = activeCustomer?.id ?? null;
  const customerName = activeCustomer?.name;

  let conversationId: string;
  if (sessionId) {
    const existing = await getConversation(sessionId);
    // Re-use the client's sessionId as the conversation ID so the frontend's
    // stored reference stays valid even after a DB reset.
    conversationId = existing ? existing.id : (await createConversation(customerId ?? undefined, sessionId)).id;
  } else {
    conversationId = (await createConversation(customerId ?? undefined)).id;
  }

  reqLog.log('identity', { customerId: customerId ?? 'unknown', conversationId });

  const userMsg = await saveMessage(conversationId, 'user', message);
  reqLog.log('db.save_user_message');

  storeMessageEmbedding(userMsg.id, message).catch((err) => {
    logError({ event: 'embedding.store', messageId: userMsg.id, conversationId, error: err });
  });

  let orderContext = '';
  let card: CardPayload | null = null;
  let card_payloads: CardPayload[] | null = null;

  const orderRefs = Array.from(
    new Set((message.match(ORDER_RE) ?? []).map((s) => s.toUpperCase()))
  );
  const isMyOrders = isOrderListIntent(message);

  const customerContext = customerName
    ? `${CONTEXT_TAGS.ACTIVE_CUSTOMER}: ${customerName}. This is who you are currently helping.`
    : '';

  // Detect if the user is claiming a different identity than the active customer
  let identityContext = '';
  const claimedName = detectIdentityClaim(message);
  if (claimedName && customerName) {
    const activeFirst = customerName.split(' ')[0].toLowerCase();
    const claimedLower = claimedName.toLowerCase();
    const matchesActive =
      customerName.toLowerCase().includes(claimedLower) ||
      claimedLower.includes(activeFirst);
    if (!matchesActive) {
      identityContext =
        `${CONTEXT_TAGS.IDENTITY_CONFLICT}: the active session belongs to ${customerName}, ` +
        `but the user just claimed to be "${claimedName}". ` +
        `Politely confirm the account holder's name and continue helping as ${customerName}.`;
    }
  }

  // Pre-fetch the customer's full order list when the message has order-related signals.
  // Injected as ORDERS_FOR_CUSTOMER grounding context so the LLM can reject impossible
  // claims and name the actual items. Skipped for pure policy / product questions to
  // avoid a redundant DB query and keep prompts smaller.
  let allCustomerOrders: Awaited<ReturnType<typeof getOrdersByCustomerId>> = [];
  let customerOrdersFetchError = false;
  if (customerId && hasOrderSignals(message)) {
    try {
      allCustomerOrders = await getOrdersByCustomerId(customerId);
      reqLog.log('orders.prefetch', { customerId: customerId ?? 'unknown', count: allCustomerOrders.length });
    } catch (err) {
      customerOrdersFetchError = true;
      logError({ event: 'orders.prefetch', customerId, conversationId, error: err });
      reqLog.error('orders.prefetch', { code: 'db_error' });
    }
  } else if (customerId) {
    reqLog.log('orders.prefetch_skipped', { reason: 'no_order_signals' });
  }

  const ordersForCustomerContext =
    customerName && allCustomerOrders.length > 0
      ? `${CONTEXT_TAGS.ORDERS_FOR_CUSTOMER}: ${allCustomerOrders
          .map((o) => `${o.order_number} (${formatItems(o.items)}, ${o.status})`)
          .join('; ')}.`
      : '';

  if (isMyOrders) {
    if (!customerName) {
      // Guard: never infer a customer name from the user's message; require session context
      orderContext = `${CONTEXT_TAGS.NO_ACTIVE_CUSTOMER}: cannot list orders without a known active customer.`;
    } else {
      log({ event: 'orders.list_intent', customerId, conversationId });
      // Reuse the pre-fetched list — always session-bound, never a name from the message
      if (customerOrdersFetchError) {
        orderContext = `${CONTEXT_TAGS.MY_ORDERS_ERROR}: could not retrieve orders for ${customerName}.`;
      } else if (allCustomerOrders.length > 0) {
        const details = allCustomerOrders.map(orderDetailLine).join(' | ');
        orderContext =
          `${CONTEXT_TAGS.MY_ORDERS_FOUND}: ${customerName} has ${allCustomerOrders.length} order(s). ` +
          `Details: ${details}. ` +
          `Greet ${customerName.split(' ')[0]} by name, then describe each order with its exact status and name the items. ` +
          `The customer is already identified — do NOT ask them to identify themselves.`;
        card_payloads = allCustomerOrders.map(toCard);
      } else {
        orderContext = `${CONTEXT_TAGS.MY_ORDERS_NONE}: no orders found for customer ${customerName}.`;
      }
    }
  } else if (orderRefs.length === 1) {
    try {
      const order = await getOrderByNumber(orderRefs[0]);
      if (order) {
        if (!customerOwns(order, customerName, customerId)) {
          orderContext =
            `${CONTEXT_TAGS.ORDER_BELONGS_TO_OTHER}: order ${orderRefs[0]} exists but belongs to a different customer. ` +
            `Do not reveal any details about it.`;
        } else {
          orderContext =
            `${CONTEXT_TAGS.ORDER_FOUND}: ${orderDetailLine(order)} ` +
            `Use the exact status word. Name the items in your reply.`;
          card = toCard(order);
        }
      } else {
        orderContext = `${CONTEXT_TAGS.NO_ORDER_FOUND}: user referenced order ${orderRefs[0]} but no matching order exists.`;
      }
    } catch (err) {
      logError({ event: 'order.lookup', orderNumber: orderRefs[0], conversationId, error: err });
      orderContext = `${CONTEXT_TAGS.NO_ORDER_FOUND}: order lookup failed for ${orderRefs[0]}.`;
    }
  } else if (orderRefs.length > 1) {
    try {
      const results = await Promise.all(
        orderRefs.map((ref) => getOrderByNumber(ref).catch(() => null))
      );
      const found = results.filter((o): o is NonNullable<typeof o> => o !== null);
      const notFound = orderRefs.filter((_, i) => results[i] === null);

      const owned = found.filter((o) => customerOwns(o, customerName, customerId));
      const foreign = found.filter((o) => !customerOwns(o, customerName, customerId));

      if (owned.length > 0) {
        const details = owned.map(orderDetailLine).join(' | ');
        orderContext =
          `${CONTEXT_TAGS.MULTIPLE_ORDERS_FOUND}: ${owned.length} order(s) for ${customerName ?? 'this customer'}. ` +
          `Details: ${details}.` +
          (foreign.length > 0
            ? ` ${CONTEXT_TAGS.ORDER_BELONGS_TO_OTHER}: ${foreign.map((o) => o.order_number).join(', ')} belong to other customers — do not reveal their details.`
            : '') +
          (notFound.length > 0 ? ` Not found: ${notFound.join(', ')}.` : '') +
          ` Describe each owned order with its exact status and name the items.`;
        card_payloads = owned.map(toCard);
      } else if (foreign.length > 0) {
        orderContext =
          `${CONTEXT_TAGS.ORDER_BELONGS_TO_OTHER}: all referenced orders (${foreign.map((o) => o.order_number).join(', ')}) ` +
          `belong to other customers. Do not reveal any details.`;
      } else {
        orderContext = `${CONTEXT_TAGS.NO_ORDERS_FOUND}: none of the referenced orders (${orderRefs.join(', ')}) exist.`;
      }
    } catch (err) {
      logError({ event: 'order.multi_lookup', orderNumbers: orderRefs, conversationId, error: err });
      orderContext = `${CONTEXT_TAGS.NO_ORDER_FOUND}: order lookup failed.`;
    }
  }

  const combinedContext = [customerContext, identityContext, ordersForCustomerContext, orderContext].filter(Boolean).join('\n');
  const history = await getMessages(conversationId);
  const { reply } = await generateReply(
    history,
    message,
    conversationId,
    combinedContext || undefined,
    reqLog
  );

  // Persist AI message — card_payload stores the first (or only) card for lightweight
  // queries; card_payloads stores the full array so session restore can show all cards.
  const persistCard = card ?? card_payloads?.[0] ?? null;
  const persistPayloads =
    card_payloads && card_payloads.length > 1
      ? (card_payloads as unknown as Record<string, unknown>[])
      : null;
  const aiMsg = await saveMessage(
    conversationId,
    'ai',
    reply,
    persistCard ? (persistCard as unknown as Record<string, unknown>) : null,
    persistPayloads
  );
  reqLog.log('db.save_ai_message');

  storeMessageEmbedding(aiMsg.id, reply).catch((err) => {
    logError({ event: 'embedding.store', messageId: aiMsg.id, conversationId, error: err });
  });
  reqLog.log('embedding.queued', { count: 2 });

  return {
    reply,
    sessionId: conversationId,
    card,
    ...(card_payloads ? { card_payloads } : {}),
  };
}

export async function getChatHistory(sessionId: string) {
  const conversation = await getConversation(sessionId);
  if (!conversation) return null;
  return getMessages(sessionId);
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const conversation = await getConversation(sessionId);
  if (!conversation) return false;
  await deleteConversation(sessionId);
  return true;
}
