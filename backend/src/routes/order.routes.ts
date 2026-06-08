import { Router, Request, Response, NextFunction } from 'express';
import { validateParams, orderNumberSchema } from '../middleware/validate';
import { requireAdminKey } from '../middleware/adminAuth';
import { getOrder, advanceOrder } from '../services/order.service';

const router = Router();

router.get(
  '/:orderNumber',
  validateParams(orderNumberSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await getOrder(req.params.orderNumber);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      res.json(order);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:orderNumber/advance',
  requireAdminKey,
  validateParams(orderNumberSchema),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await advanceOrder(req.params.orderNumber);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      res.json(order);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
