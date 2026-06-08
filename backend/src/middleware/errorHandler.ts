import { Request, Response, NextFunction } from 'express';
import { LLMError, DBError } from '../types';
import { logError } from '../lib/logger';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof LLMError) {
    const status =
      err.code === 'rate_limit' ? 429 :
      err.code === 'timeout' ? 504 :
      502;
    logError({ event: 'error_handler.llm', code: err.code, status, error: err });
    res.status(status).json({ error: err.message });
    return;
  }
  if (err instanceof DBError) {
    logError({ event: 'error_handler.db', error: err });
    res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
    return;
  }
  logError({ event: 'error_handler.unhandled', error: err });
  res.status(500).json({ error: 'Internal server error' });
}
