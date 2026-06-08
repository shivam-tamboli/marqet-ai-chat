import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import chatRoutes from './routes/chat.routes';
import orderRoutes from './routes/order.routes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { LIMITS } from './lib/constants';

const app = express();

const corsOrigin =
  process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN
    : /^http:\/\/localhost(:\d+)?$/;

app.use(cors({ origin: corsOrigin }));

// Limit body size to guard against oversized payloads
app.use(express.json({ limit: LIMITS.JSON_BODY }));

app.use(requestLogger);

// Protects both the LLM and DB from abuse
app.use(
  rateLimit({
    windowMs: LIMITS.RATE_LIMIT_WINDOW_MS,
    max: LIMITS.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again in a few minutes.' },
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/chat', chatRoutes);
app.use('/orders', orderRoutes);

// Handle malformed JSON bodies before the 404 catch-all so bad JSON returns 400, not 404
app.use((err: unknown, _req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof SyntaxError && 'body' in (err as object)) {
    res.status(400).json({ error: 'Invalid JSON in request body' });
    return;
  }
  next(err);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export default app;
