import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { LIMITS } from '../lib/constants';

export const chatMessageSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(LIMITS.MSG_MAX_LEN, `Message must be ${LIMITS.MSG_MAX_LEN} characters or fewer`),
  sessionId: z.string().uuid('Invalid session ID format').optional(),
  customerId: z.string().max(LIMITS.CUSTOMER_ID_MAX_LEN).optional(),    // preferred: slug, e.g. 'priya'
  customerName: z.string().max(LIMITS.CUSTOMER_NAME_MAX_LEN).optional(), // legacy fallback — still accepted
});

export const orderNumberSchema = z.object({
  orderNumber: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,30}$/, 'Invalid order number format'),
});

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors.map((e) => e.message),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export const sessionIdParamSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
});

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation error',
        details: result.error.errors.map((e) => e.message),
      });
      return;
    }
    next();
  };
}
