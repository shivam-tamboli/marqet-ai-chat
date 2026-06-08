import { Request, Response, NextFunction } from 'express';
import { getCustomerById, getCustomerByName } from '../db/queries';

// Resolves the active customer from the request and sets req.activeCustomer.
//
// Resolution order:
//   1. customerId UUID in body or x-customer-id header (new contract)
//   2. customerName string in body or x-customer-name header (legacy fallback)
//
// The resolved name is used server-side for LLM context only — it never
// appears in logs and is not echoed back to the client.
export async function resolveCustomerIdentity(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Priority 1: UUID-based (e.g. '8768f042-f13b-43bb-8d9d-01843a520a2d')
    const idHeader = req.headers['x-customer-id'];
    const idBody = req.body?.customerId;
    const customerId =
      typeof idHeader === 'string' && idHeader.trim()
        ? idHeader.trim()
        : typeof idBody === 'string' && idBody.trim()
        ? idBody.trim()
        : null;

    if (customerId) {
      const customer = await getCustomerById(customerId).catch(() => null);
      if (customer) {
        req.activeCustomer = { id: customer.id, name: customer.name };
        next();
        return;
      }
    }

    // Priority 2: name-based (legacy — still accepted for backwards compat)
    const nameHeader = req.headers['x-customer-name'];
    const nameBody = req.body?.customerName;
    const name =
      typeof nameHeader === 'string' && nameHeader.trim()
        ? nameHeader.trim()
        : typeof nameBody === 'string' && nameBody.trim()
        ? nameBody.trim()
        : null;

    if (name) {
      const customer = await getCustomerByName(name).catch(() => null);
      if (customer) {
        req.activeCustomer = { id: customer.id, name: customer.name };
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
