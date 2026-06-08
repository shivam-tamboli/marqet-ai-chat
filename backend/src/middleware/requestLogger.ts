import { Request, Response, NextFunction } from 'express';
import { makeRequestLogger, RequestLogger } from '../lib/logger';
import type { ActiveCustomer } from '../types';

declare global {
  namespace Express {
    interface Request {
      log: RequestLogger;
      startedAt: number;
      activeCustomer?: ActiveCustomer | null;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  req.log = makeRequestLogger();
  req.startedAt = Date.now();
  req.log.log('START', { method: req.method, path: req.path });
  res.on('finish', () => {
    req.log.end('', { status: res.statusCode, total: `${Date.now() - req.startedAt}ms` });
  });
  next();
}
