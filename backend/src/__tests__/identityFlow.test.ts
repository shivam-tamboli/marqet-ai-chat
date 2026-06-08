import { customerOwns, detectIdentityClaim } from '../lib/chatHelpers';
import type { ActiveCustomer } from '../types';

// ---------------------------------------------------------------------------
// ActiveCustomer.name — not id — reaches the LLM context string.
// The ACTIVE_CUSTOMER tag uses the human-readable name so the LLM can
// refer to the customer naturally. The UUID must never appear in that context.
// ---------------------------------------------------------------------------

describe('ACTIVE_CUSTOMER context uses name not id', () => {
  function buildCustomerContext(activeCustomer?: ActiveCustomer | null): string {
    const customerName = activeCustomer?.name;
    return customerName
      ? `ACTIVE_CUSTOMER: ${customerName}. This is who you are currently helping.`
      : '';
  }

  const priya: ActiveCustomer = {
    id: '8768f042-f13b-43bb-8d9d-01843a520a2d',
    name: 'Priya Sharma',
  };

  it('includes the full display name', () => {
    const ctx = buildCustomerContext(priya);
    expect(ctx).toContain('Priya Sharma');
  });

  it('does not include the UUID', () => {
    const ctx = buildCustomerContext(priya);
    expect(ctx).not.toContain('8768f042');
  });

  it('returns empty string when no active customer', () => {
    expect(buildCustomerContext(null)).toBe('');
    expect(buildCustomerContext(undefined)).toBe('');
  });
});

// ---------------------------------------------------------------------------
// customerOwns UUID path
// Every order has customer_id (UUID). These tests confirm cross-customer
// access is denied even when names look similar.
// ---------------------------------------------------------------------------

describe('customerOwns — UUID ownership', () => {
  const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

  const priyaId = uuid(1);
  const arjunId = uuid(2);
  const snehaId = uuid(3);

  it('grants access when UUID matches', () => {
    const order = { customer_name: 'Priya Sharma', customer_id: priyaId };
    expect(customerOwns(order, 'Priya Sharma', priyaId)).toBe(true);
  });

  it('denies access when UUID differs (cross-customer)', () => {
    const arjunOrder = { customer_name: 'Arjun Nair', customer_id: arjunId };
    expect(customerOwns(arjunOrder, 'Priya Sharma', priyaId)).toBe(false);
  });

  it('UUID check wins over a matching name on the wrong account', () => {
    const order = { customer_name: 'Arjun Nair', customer_id: arjunId };
    expect(customerOwns(order, 'Arjun Nair', priyaId)).toBe(false);
  });

  it('denies access for a third customer whose UUID is neither', () => {
    const priyaOrder = { customer_name: 'Priya Sharma', customer_id: priyaId };
    expect(customerOwns(priyaOrder, 'Sneha Patel', snehaId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectIdentityClaim
// ---------------------------------------------------------------------------

describe('detectIdentityClaim', () => {
  it('matches "my name is Priya Sharma" and captures full name', () => {
    expect(detectIdentityClaim('my name is Priya Sharma')).toBe('Priya Sharma');
  });

  it('matches "I am Arjun Nair" with capital initial', () => {
    expect(detectIdentityClaim('I am Arjun Nair')).toBe('Arjun Nair');
  });

  it('does not trigger on a bare first name without a claim phrase', () => {
    expect(detectIdentityClaim('priya')).toBeNull();
    expect(detectIdentityClaim('arjun here')).toBeNull();
  });
});
