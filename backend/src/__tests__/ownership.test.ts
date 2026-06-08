import { customerOwns, detectIdentityClaim, ORDER_RE } from '../lib/chatHelpers';

// ---------------------------------------------------------------------------
// customerOwns
// ---------------------------------------------------------------------------

describe('customerOwns', () => {
  const order = (name: string) => ({ customer_name: name });

  it('returns true when names match exactly', () => {
    expect(customerOwns(order('Priya Sharma'), 'Priya Sharma')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(customerOwns(order('priya sharma'), 'PRIYA SHARMA')).toBe(true);
  });

  it('trims surrounding whitespace before comparing', () => {
    expect(customerOwns(order(' Priya Sharma '), 'Priya Sharma')).toBe(true);
  });

  it('returns false when names differ', () => {
    expect(customerOwns(order('Arjun Nair'), 'Priya Sharma')).toBe(false);
  });

  it('returns true when customerName is undefined (no session context)', () => {
    expect(customerOwns(order('Anyone'), undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// detectIdentityClaim
// ---------------------------------------------------------------------------

describe('detectIdentityClaim', () => {
  it('detects "my name is X"', () => {
    expect(detectIdentityClaim('my name is Arjun Nair')).toBe('Arjun Nair');
  });

  it('detects "I am X" with capital initial', () => {
    expect(detectIdentityClaim('I am Sneha Patel')).toBe('Sneha Patel');
  });

  it("detects \"I'm X\"", () => {
    expect(detectIdentityClaim("I'm Divya Reddy")).toBe('Divya Reddy');
  });

  it('detects "this is X"', () => {
    expect(detectIdentityClaim('this is Karan Singh')).toBe('Karan Singh');
  });

  it('detects "call me X"', () => {
    expect(detectIdentityClaim('call me Priya')).toBe('Priya');
  });

  it('ignores short lowercase words after "I am" to avoid false positives', () => {
    // "I am fine" — "fine" is lowercase, under 3 chars after trim wouldn't match capital rule
    // The pattern requires [A-Z] capital start for "I am/I'm" patterns
    expect(detectIdentityClaim("I'm fine, thanks")).toBeNull();
  });

  it('ignores common false positive "I am a customer"', () => {
    // "a" is a single char, won't reach length >= 3 after slice
    const result = detectIdentityClaim('I am a customer');
    // "a customer" trims to 2 words → "a customer" length > 3, but starts lowercase
    // The pattern for "I am" requires [A-Z] start, so this should be null
    expect(result).toBeNull();
  });

  it('returns null when no identity claim present', () => {
    expect(detectIdentityClaim('where is my order MQ-1001')).toBeNull();
    expect(detectIdentityClaim('what is your return policy?')).toBeNull();
  });

  it('trims trailing punctuation from the captured name', () => {
    expect(detectIdentityClaim('my name is Priya Sharma.')).toBe('Priya Sharma');
  });

  it('captures at most 3 words from the name', () => {
    // "John Michael Adam Smith" → only first 3 words captured
    expect(detectIdentityClaim('my name is John Michael Adam Smith')).toBe('John Michael Adam');
  });
});

// ---------------------------------------------------------------------------
// Order number format (validates the regex used in chat.service.ts)
// ---------------------------------------------------------------------------

describe('ORDER_RE pattern', () => {

  it('matches standard 4-digit order numbers', () => {
    expect('my order MQ-1001 is late'.match(ORDER_RE)).toEqual(['MQ-1001']);
  });

  it('matches 5-digit order numbers', () => {
    expect('order MQ-10001'.match(ORDER_RE)).toEqual(['MQ-10001']);
  });

  it('does not match fewer than 4 digits', () => {
    expect('MQ-123'.match(ORDER_RE)).toBeNull();
  });

  it('does not match without the MQ- prefix', () => {
    expect('order 1001'.match(ORDER_RE)).toBeNull();
  });

  it('deduplicates repeated references to the same order', () => {
    const text = 'MQ-1001 and also MQ-1001 again';
    const refs = Array.from(new Set((text.match(ORDER_RE) ?? []).map((s) => s.toUpperCase())));
    expect(refs).toEqual(['MQ-1001']);
  });

  it('extracts multiple distinct order numbers', () => {
    const text = 'check MQ-1001 and MQ-1002 please';
    const refs = Array.from(new Set((text.match(ORDER_RE) ?? []).map((s) => s.toUpperCase())));
    expect(refs).toHaveLength(2);
    expect(refs).toContain('MQ-1001');
    expect(refs).toContain('MQ-1002');
  });
});
