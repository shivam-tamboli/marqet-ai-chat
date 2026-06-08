export const STORAGE_KEYS = {
  ACTIVE_CUSTOMER: 'marqet_active_customer',
  BUBBLE_CORNER: 'marqet_bubble_corner',
} as const;

export const sessionsKey = (customerId: string): string =>
  `marqet_sessions_${customerId}`;

export const activeSessionKey = (customerId: string): string =>
  `marqet_active_session_${customerId}`;
