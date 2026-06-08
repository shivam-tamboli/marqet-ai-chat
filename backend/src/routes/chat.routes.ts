import { Router, Request, Response, NextFunction } from 'express';
import { validateBody, validateParams, chatMessageSchema, sessionIdParamSchema } from '../middleware/validate';
import { resolveCustomerIdentity } from '../middleware/identity';
import { handleChatMessage, getChatHistory, deleteSession } from '../services/chat.service';

const router = Router();

router.post(
  '/message',
  resolveCustomerIdentity,
  validateBody(chatMessageSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { message, sessionId } = req.body as { message: string; sessionId?: string };
      req.log.log('chat.receive', { sessionId, messageLen: message?.length ?? 0 });
      const result = await handleChatMessage(message, sessionId, req.activeCustomer ?? null, req.log);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/:sessionId/messages',
  validateParams(sessionIdParamSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const messages = await getChatHistory(req.params.sessionId);
      if (!messages) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.json(messages);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:sessionId',
  validateParams(sessionIdParamSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const deleted = await deleteSession(req.params.sessionId);
      if (!deleted) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
