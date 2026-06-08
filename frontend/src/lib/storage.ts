export const STORAGE_KEYS = {
  ACTIVE_CUSTOMER: 'marqet_active_customer',
  BUBBLE_CORNER: 'marqet_bubble_corner',
} as const;

export const sessionsKey = (customerId: string): string =>
  `marqet_sessions_${customerId}`;

export const activeSessionKey = (customerId: string): string =>
  `marqet_active_session_${customerId}`;

// Slugs used before the UUID migration (migration 010). Any localStorage
// keys that still use these as suffixes are stale and must be cleared so
// they don't shadow the UUID-keyed entries that the current code creates.
const LEGACY_SLUGS = ['priya', 'arjun', 'sneha', 'divya', 'karan'];

export function clearLegacySlugKeys(): void {
  try {
    for (const slug of LEGACY_SLUGS) {
      localStorage.removeItem(sessionsKey(slug));
      localStorage.removeItem(activeSessionKey(slug));
    }
    // Also clear the active-customer key if it still holds a slug value
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOMER);
    if (stored && LEGACY_SLUGS.includes(stored)) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CUSTOMER);
    }
  } catch {
    // localStorage may be unavailable in some environments
  }
}
