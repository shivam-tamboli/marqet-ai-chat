import { Request, Response, NextFunction } from 'express';

// Guards demo-only mutation endpoints (e.g. POST /orders/:num/advance).
// Set DEMO_ADMIN_KEY in .env; omit it to leave the endpoint open in local dev.
export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.DEMO_ADMIN_KEY;
  if (!configuredKey) {
    next();
    return;
  }
  if (req.headers['x-admin-key'] !== configuredKey) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
