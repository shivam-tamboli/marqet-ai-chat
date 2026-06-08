// In production (NODE_ENV=production) emits newline-delimited JSON so log
// aggregators (Datadog, CloudWatch, etc.) can parse fields natively.
// In development emits a human-readable "[event] key=value ..." line instead.
//
// PII RULE: never log customer names, emails, phone numbers, addresses, or
// payment details. customerId (uuid) is acceptable since it's opaque.

import { randomUUID } from 'crypto';

const isProd = process.env.NODE_ENV === 'production';

export interface LogFields {
  event: string;
  [key: string]: unknown;
}

function serialize(fields: LogFields & { level?: string }): string {
  if (isProd) {
    return JSON.stringify({ ts: new Date().toISOString(), ...fields });
  }
  const { event, level: _l, ...rest } = fields;
  const pairs = Object.entries(rest)
    .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join(' ');
  return `[${event}]${pairs ? ' ' + pairs : ''}`;
}

export function log(fields: LogFields): void {
  console.log(serialize(fields));
}

export function logError(fields: LogFields & { error: unknown }): void {
  const { error, ...rest } = fields;
  const message = error instanceof Error ? error.message : String(error);
  console.error(serialize({ level: 'error', ...rest, error: message }));
}

// ─── Request-scoped logger ────────────────────────────────────────────────────
// Attaches a short random id to every log line so one chat request can be
// traced from START through middleware, RAG, LLM, DB writes, and END.

export function newRequestId(): string {
  return randomUUID().slice(0, 8);
}

const fmt = (kv?: Record<string, unknown>): string =>
  kv
    ? ' ' +
      Object.entries(kv)
        .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join(' ')
    : '';

export interface RequestLogger {
  readonly id: string;
  log(stage: string, kv?: Record<string, unknown>): void;
  error(stage: string, kv?: Record<string, unknown>): void;
  end(stage: string, kv?: Record<string, unknown>): void;
}

export function makeRequestLogger(reqId: string = newRequestId()): RequestLogger {
  return {
    id: reqId,
    log(stage, kv)  { console.log(`[req:${reqId} ${stage}]${fmt(kv)}`); },
    error(stage, kv){ console.error(`[req:${reqId} ${stage}]${fmt(kv)}`); },
    end(stage, kv)  { console.log(`[req:${reqId} END${stage ? ' ' + stage : ''}]${fmt(kv)}`); },
  };
}

// No-op logger for seed scripts, tests, and non-request contexts.
export const noopLogger: RequestLogger = {
  id: 'noop',
  log()  {},
  error(){},
  end()  {},
};
