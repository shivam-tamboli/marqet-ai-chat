# Marqet AI Chat

An AI-powered live chat support widget for Marqet, a fictional Indian e-commerce marketplace. Users chat with an AI agent that knows Marqet's product catalog, policies, and pricing via a RAG pipeline, can track mock orders in real time, and can manage multiple independent conversation sessions.

**Live demo:** [https://spur-ai-chat-five.vercel.app](https://spur-ai-chat-five.vercel.app)  
**Backend API:** [https://spur-ai-chat-vmie.onrender.com](https://spur-ai-chat-vmie.onrender.com) — health check: [`/health`](https://spur-ai-chat-vmie.onrender.com/health)

---

## Features

- **RAG-powered AI agent** — answers questions about Marqet products and policies using embedded FAQ chunks + per-session conversation memory
- **Real-time order tracking** — order status pills update live via Supabase Realtime
- **Multi-session history** — independent sessions stored locally per customer; switch between past conversations without losing history (see [Multi-Session](#multi-session))
- **Delete session** — remove any session from history; backend cascades through messages and embeddings
- **Session isolation** — RAG memory retrieval is scoped per session so conversations don't contaminate each other
- **Per-customer session scoping** — each of the 5 mock customers has their own independent session list in localStorage; switching customer restores their last active conversation
- **Mock user switcher** — browse as one of 5 customers (Priya, Arjun, Sneha, Divya, Karan); AI knows who you are
- **Multi-order tracking** — mention two order IDs in one message to get two cards in one reply
- **Order history intent** — natural phrases like "what did I order", "my purchases", "what have I bought" all trigger the full order-history flow for the active customer
- **Privacy guard** — every order lookup runs a `customerOwns()` check; cross-customer data is never revealed
- **Identity lock** — `detectIdentityClaim()` detects "my name is X" patterns and blocks identity hijacking mid-session
- **Anti-hallucination grounding** — customer's full order list is injected as `ORDERS_FOR_CUSTOMER` on every turn so the LLM can reject false claims like "I ordered a TV"
- **Chat-first interface** — floating chat bubble on a clean canvas; drag it to any corner, click to open the full support widget

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + TypeScript + Express |
| Frontend | React + Vite + TypeScript + Tailwind CSS + react-markdown |
| Database | Supabase (PostgreSQL + pgvector + Realtime) |
| LLM | OpenAI gpt-4o-mini |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Deployment | Backend → Render, Frontend → Vercel |

---

## Local Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with pgvector enabled
- An OpenAI API key

### 1. Clone and install

```bash
git clone https://github.com/shivam-tamboli/spur-ai-chat.git
cd spur-ai-chat

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

**Backend** (`backend/.env`):

```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ANON_KEY=eyJ...
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

**Frontend** (`frontend/.env`):

```
VITE_API_BASE_URL=http://localhost:3001
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 3. Run Supabase migrations

In your Supabase dashboard → SQL editor, run these files in order:

```
backend/supabase/migrations/001_init.sql
backend/supabase/migrations/002_vector_search_functions.sql
backend/supabase/migrations/003_session_isolated_embeddings.sql
backend/supabase/migrations/004_marqet_status_rename.sql
backend/supabase/migrations/005_fix_order_customer_mapping.sql
backend/supabase/migrations/006_add_card_payloads_column.sql
backend/supabase/migrations/007_add_customers_table.sql
backend/supabase/migrations/008_embedding_not_null_and_indexes.sql
backend/supabase/migrations/009_customer_slug.sql
backend/supabase/migrations/010_remove_slug_use_uuid.sql
```

> **Note:** Real-time order tracking requires `orders` to be in the Supabase Realtime publication. Verify with:
> ```sql
> SELECT pubname, tablename FROM pg_publication_tables WHERE tablename = 'orders';
> ```
> If that returns zero rows, run: `ALTER PUBLICATION supabase_realtime ADD TABLE orders;`

Or use the Supabase CLI:

```bash
supabase db push
```

### 4. Start the backend

```bash
cd backend
npm run dev
```

On first startup, the server automatically:
- Seeds 38 Marqet FAQ chunks into `faq_chunks` with embeddings (requires `OPENAI_API_KEY`)
- Seeds 7 mock orders (MQ-1001 through MQ-1007) into `orders`

Both seed steps are idempotent and skip if rows already exist.

> **Manual seed scripts** (if you need to run them independently):
> ```bash
> cd backend
> npm run seed:faq     # embeds 38 FAQ chunks (calls OpenAI — requires OPENAI_API_KEY)
> npm run seed:orders  # inserts 7 mock orders (MQ-1001 through MQ-1007)
> ```

> **Re-seeding after a schema change:** If you need fresh Supabase data, clear both tables first:
> ```sql
> DELETE FROM faq_chunks; DELETE FROM orders;
> ```
> Then restart the backend to re-seed automatically.

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`.

---

## Environment Variables Reference

| Variable | Where | Description |
|---|---|---|
| `OPENAI_API_KEY` | backend | Used for chat completions (gpt-4o-mini) and embeddings (text-embedding-3-small) |
| `SUPABASE_URL` | backend + frontend | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Service role key for server-side writes |
| `SUPABASE_ANON_KEY` | backend + frontend | Anon key for Realtime subscription on the frontend |
| `PORT` | backend | HTTP port (default: 3001) |
| `CORS_ORIGIN` | backend | Allowed frontend origin in production |
| `SUPPORT_EMAIL` | backend | Injected into AI fail-safe escalation reply |
| `SUPPORT_PHONE` | backend | Injected into AI fail-safe escalation reply |
| `DEMO_ADMIN_KEY` | backend | Optional secret for `POST /orders/:num/advance` — omit in local dev to leave the endpoint open |
| `VITE_API_BASE_URL` | frontend | Backend base URL for API calls |
| `VITE_SUPABASE_URL` | frontend | Supabase URL for Realtime client |
| `VITE_SUPABASE_ANON_KEY` | frontend | Anon key for Realtime client |

---

## Architecture Overview

The browser sends REST requests to an Express backend and maintains a Supabase Realtime WebSocket for live order updates.

The backend processes each chat message through three layers:
1. **Order intent detection** — regex for `MQ-XXXX` refs + natural-language "my orders" patterns; each match triggers a DB lookup with a customer ownership check before injecting context
2. **RAG retrieval** — user message is embedded, top-3 from `faq_chunks` + top-3 from `message_embeddings` (scoped to the active session) are retrieved and injected into the system prompt
3. **LLM completion** — `gpt-4o-mini` generates a reply using the combined context; the response includes the reply text plus structured `card` / `card_payloads` fields for order card rendering

Full architecture reference in [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Order Status Simulator

`POST /orders/:orderNumber/advance` advances an order through its lifecycle:

```
Pending → Processing → Packed → Shipped → Delivered
```

The endpoint triggers a Supabase Realtime event that the frontend picks up immediately, updating order status pills without a page refresh.

**Usage:**

```bash
# Local — DEMO_ADMIN_KEY not set, so no header required
curl -X POST http://localhost:3001/orders/MQ-1001/advance

# Production — DEMO_ADMIN_KEY must be set in Render env vars
curl -X POST https://spur-ai-chat-vmie.onrender.com/orders/MQ-1001/advance \
  -H "x-admin-key: YOUR_DEMO_ADMIN_KEY"
```

Ask the AI about an order, advance it with the curl above, then ask again — the status in the chat card will reflect the new state without reloading.

---

## Multi-Session

The widget supports multiple independent conversation sessions without requiring a login.

- Click **+** in the header to start a new session. No DB row is created until the first message is sent.
- Click the **list icon** to open the Session Switcher panel, which shows all past sessions with a first-message preview and relative timestamp.
- Clicking a past session fetches its full history and restores the thread.
- Each customer has their own isolated localStorage keys: `marqet_sessions_<customerId>` and `marqet_active_session_<customerId>`. Sessions survive page reload.
- Sessions can be deleted via the × button in the Session Switcher; backend cascades through messages and embeddings.
- Switching customer restores that customer's previous sessions and last active conversation — no session bleed between customers.
- **RAG isolation:** message embedding retrieval is scoped to the active `conversation_id`, so past conversations in other sessions never appear as context in the current one. FAQ knowledge (Marqet products, policies) is shared across all sessions.

---

## LLM Notes

- **Model:** `gpt-4o-mini` — fast and cost-effective for support chat at this scale.
- **RAG:** Each user message is embedded, then top-3 results from `faq_chunks` and top-3 from `message_embeddings` are retrieved via cosine similarity and injected into the system prompt (6 chunks max).
- **History:** Last 20 messages from the conversation are sent as context on each request.
- **Message embeddings:** Stored asynchronously after each turn (fire-and-forget). If embedding fails, future RAG recall for that message is degraded but the chat response is unaffected.
- **Token limit:** `max_tokens: 512`, `temperature: 0.4`.

---

## Trade-offs and Design Decisions

| Decision | Rationale |
|---|---|
| Supabase for everything | Postgres + pgvector + Realtime in one free-tier service — no extra infrastructure |
| gpt-4o-mini over GPT-4o | 10× cheaper, fast enough for support chat, strong instruction-following |
| Dual RAG stores (FAQ + message history) | FAQ for Marqet catalog/policy knowledge, message embeddings for conversational long-term memory |
| Session ID in localStorage | No auth required per spec; survives page reload |
| Per-customer localStorage keys | Prevents session bleed when switching between the 5 demo customers without auth |
| Fire-and-forget message embedding | Storing embeddings async keeps response latency low; degraded RAG recall is acceptable |
| Order card triggered by regex | Simple MQ-XXXX pattern detection; no extra LLM call needed |
| `customerOwns()` privacy filter | All order lookups check ownership before injecting context — cross-customer data never reaches the LLM |
| `ORDERS_FOR_CUSTOMER` grounding context | Pre-fetched once per turn and injected on every message so the LLM can reject impossible claims |
| `customerId` UUID over the wire (not `customerName`) | API sends the DB UUID directly; backend looks up the display name server-side. PII stays server-side; name never traverses the network. Legacy `customerName` still accepted. |
| ivfflat indexes (lists=50) | Suitable for the FAQ chunk count (~38); upgrade to hnsw at scale |

---

## Production Readiness

- **Rate limiting:** `express-rate-limit` middleware is enabled per-IP (100 req / 15 min) protecting both the LLM and DB from abuse.
- **Structured logging:** `lib/logger.ts` emits JSON in production and tagged strings in dev; every request gets an 8-char trace ID attached through all pipeline log lines.
- **Request-scoped tracing:** each stage of a chat request (identity resolve → order prefetch → RAG → LLM → embedding store) is logged with the same request ID for easy correlation.
- **Test suite:** tests across 4 suites — `ownership`, `customerIdentity`, `systemPrompt`, and `identityFlow` — cover the highest-risk surfaces: cross-customer data leakage, identity hijacking, escalation contact injection, and UUID-based ownership invariants.

## Future Scope

### Observability — OpenTelemetry
The backend uses a structured JSON logger today. Wiring in OpenTelemetry (OTLP traces + metrics) would expose per-request latency breakdowns across the RAG retrieval, LLM call, and DB write phases. A Grafana dashboard fed by an OTel collector would surface p99 latencies and token spend without needing to grep logs — critical before production traffic.

### RAG Evaluation Pipeline
The current RAG setup is manually verified by reading replies. A lightweight eval harness — a fixed set of Q&A pairs, embedding retrieval ground truth, and a nightly LLM-as-judge pass — would catch regressions when FAQ chunks are edited or the similarity threshold is tuned. Tools like RAGAS or a thin custom runner in `backend/src/__tests__/rag.eval.ts` would work here.

### Async / Event-Driven Architecture
The embedding store (`storeMessageEmbedding`) is fire-and-forget today. Moving to a proper job queue (e.g. a `pending_embeddings` Postgres table polled by a worker, or BullMQ with Redis) would give retry-on-failure semantics, back-pressure under load, and observable lag metrics. The same pattern would support auto-advancing orders on a schedule and deferring heavy analytics writes without blocking the request path.

### Other
- **Auth:** Supabase Auth so sessions are tied to real user accounts rather than localStorage UUIDs.
- **Streaming:** Server-sent events for token-by-token LLM output to reduce perceived latency.
- **Tool-calling:** Replace regex-based order detection with structured function calls so the LLM can trigger cancel/refund/inventory actions with confirmation steps.
- **FAQ cache:** LRU cache on top-K FAQ retrievals to cut embedding cost on repeated policy questions.
