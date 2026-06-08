import { customerOwns } from '../lib/chatHelpers';

// ---------------------------------------------------------------------------
// customerOwns — UUID path (migration 007+)
// ---------------------------------------------------------------------------

describe('customerOwns — UUID-based comparison', () => {
  const uuid = (suffix: string) => `00000000-0000-0000-0000-${suffix.padStart(12, '0')}`;

  const priyaId = uuid('1');
  const arjunId = uuid('2');

  const priyaOrder = { customer_name: 'Priya Sharma', customer_id: priyaId };
  const arjunOrder = { customer_name: 'Arjun Nair', customer_id: arjunId };

  it('returns true when UUIDs match', () => {
    expect(customerOwns(priyaOrder, 'Priya Sharma', priyaId)).toBe(true);
  });

  it('returns false when UUIDs differ (cross-customer)', () => {
    expect(customerOwns(arjunOrder, 'Priya Sharma', priyaId)).toBe(false);
  });

  it('UUID check takes precedence over name — prevents spoofed name matching another UUID', () => {
    // If someone passes Arjun's order but claims to be Priya (different UUID), UUID check wins
    expect(customerOwns(arjunOrder, 'Arjun Nair', priyaId)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// customerOwns — name fallback (pre-migration records or unresolved customer)
// ---------------------------------------------------------------------------

describe('customerOwns — name-based fallback', () => {
  // order.customer_id is null → migration 007 backfill hasn't run or order is legacy
  const legacyOrder = { customer_name: 'Sneha Patel', customer_id: null };

  it('falls back to name comparison when order.customer_id is null', () => {
    expect(customerOwns(legacyOrder, 'Sneha Patel')).toBe(true);
  });

  it('falls back to name comparison when customerId arg is null', () => {
    expect(customerOwns(legacyOrder, 'Sneha Patel', null)).toBe(true);
  });

  it('falls back to name comparison when customerId arg is undefined', () => {
    expect(customerOwns(legacyOrder, 'Sneha Patel', undefined)).toBe(true);
  });

  it('name fallback is case-insensitive', () => {
    expect(customerOwns(legacyOrder, 'sneha patel')).toBe(true);
  });

  it('name fallback rejects wrong customer', () => {
    expect(customerOwns(legacyOrder, 'Divya Reddy')).toBe(false);
  });

  it('returns true when customerName is undefined (no session context)', () => {
    expect(customerOwns(legacyOrder, undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// customerOwns — mixed state (one side has UUID, other doesn't)
// ---------------------------------------------------------------------------

describe('customerOwns — partial UUID state', () => {
  const uuid = (suffix: string) => `00000000-0000-0000-0000-${suffix.padStart(12, '0')}`;
  const priyaId = uuid('1');

  it('falls back to name when order has customer_id but session has none', () => {
    const order = { customer_name: 'Priya Sharma', customer_id: priyaId };
    // customerId not passed → only one side has UUID → fall back to name
    expect(customerOwns(order, 'Priya Sharma', undefined)).toBe(true);
    expect(customerOwns(order, 'Arjun Nair', undefined)).toBe(false);
  });

  it('falls back to name when session has customer_id but order has none', () => {
    const legacyOrder = { customer_name: 'Priya Sharma', customer_id: null };
    expect(customerOwns(legacyOrder, 'Priya Sharma', priyaId)).toBe(true);
    expect(customerOwns(legacyOrder, 'Arjun Nair', priyaId)).toBe(false);
  });
});
