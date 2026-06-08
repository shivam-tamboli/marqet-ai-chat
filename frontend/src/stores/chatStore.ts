import { create } from 'zustand';
import type { Message, SessionMeta } from '../types';
import { sendMessage, getHistory, deleteSession as apiDeleteSession } from '../api/chat';
import { useCustomerStore } from './customerStore';
import { sessionsKey, activeSessionKey } from '../lib/storage';

function loadSessions(customerId: string): SessionMeta[] {
  try {
    return JSON.parse(localStorage.getItem(sessionsKey(customerId)) ?? '[]');
  } catch {
    return [];
  }
}

function saveSessions(customerId: string, sessions: SessionMeta[]): void {
  localStorage.setItem(sessionsKey(customerId), JSON.stringify(sessions));
}

interface ChatState {
  messages: Message[];
  sessionId: string | null;
  sessions: SessionMeta[];
  isLoading: boolean;
  error: string | null;
  showSessionPanel: boolean;

  send: (text: string) => Promise<void>;
  retry: (failedMsgId: string, text: string) => void;
  switchSession: (id: string) => Promise<void>;
  switchCustomer: (customerId: string) => Promise<void>;
  newSession: () => void;
  deleteSession: (id: string) => Promise<void>;
  clearError: () => void;
  toggleSessionPanel: () => void;
  initStore: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: null,
  sessions: [],
  isLoading: false,
  error: null,
  showSessionPanel: false,

  initStore: async () => {
    const { id: customerId } = useCustomerStore.getState().customer;
    const sessions = loadSessions(customerId);
    const activeId = localStorage.getItem(activeSessionKey(customerId));
    if (!activeId) {
      set({ sessions });
      return;
    }
    set({ sessions, sessionId: activeId });
    const history = await getHistory(activeId).catch(() => []);
    if (history.length > 0) set({ messages: history });
  },

  send: async (text: string) => {
    const { isLoading, sessionId, sessions } = get();
    if (!text.trim() || isLoading) return;

    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, optimisticMsg], isLoading: true, error: null }));

    try {
      const { id: customerId } = useCustomerStore.getState().customer;
      const { reply, sessionId: sid, card, card_payloads } = await sendMessage(
        text,
        sessionId ?? undefined,
        customerId
      );

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: reply,
        card_payload: card ?? null,
        ...(card_payloads && card_payloads.length > 0 ? { card_payloads } : {}),
        timestamp: new Date().toISOString(),
      };

      set((s) => ({
        messages: s.messages
          .map((m) => (m.id === optimisticMsg.id ? { ...m, status: undefined } : m))
          .concat(aiMsg),
      }));

      if (!sessionId) {
        localStorage.setItem(activeSessionKey(customerId), sid);
        const newMeta: SessionMeta = {
          id: sid,
          firstMessage: text.slice(0, 60),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updated = [newMeta, ...sessions];
        saveSessions(customerId, updated);
        set({ sessionId: sid, sessions: updated });
      } else {
        const updated = sessions.map((s) =>
          s.id === sessionId ? { ...s, updatedAt: new Date().toISOString() } : s
        );
        saveSessions(customerId, updated);
        set({ sessions: updated });
      }
    } catch (err: unknown) {
      let msg = 'Something went wrong. Please try again.';
      if (err instanceof TypeError && err.message.includes('fetch')) {
        msg = 'Network error — check your connection and try again.';
      } else if (err instanceof Error) {
        msg = err.message;
      }
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === optimisticMsg.id
            ? { ...m, status: 'failed' as const, errorMessage: msg }
            : m
        ),
      }));
    } finally {
      set({ isLoading: false });
    }
  },

  retry: (failedMsgId: string, text: string) => {
    set((s) => ({ messages: s.messages.filter((m) => m.id !== failedMsgId) }));
    get().send(text);
  },

  switchSession: async (id: string) => {
    const { id: customerId } = useCustomerStore.getState().customer;
    localStorage.setItem(activeSessionKey(customerId), id);
    set({ sessionId: id, messages: [], showSessionPanel: false, error: null });
    const history = await getHistory(id).catch(() => []);
    set({ messages: history });
  },

  // Load sessions and last active session for the given customer.
  // Called by UserSwitcher after updating customerStore so per-customer
  // history is restored immediately on switch.
  switchCustomer: async (customerId: string) => {
    const sessions = loadSessions(customerId);
    const activeId = localStorage.getItem(activeSessionKey(customerId));
    set({ sessions, messages: [], sessionId: null, error: null, showSessionPanel: false });
    if (activeId) {
      set({ sessionId: activeId });
      const history = await getHistory(activeId).catch(() => []);
      if (history.length > 0) set({ messages: history });
    }
  },

  newSession: () => {
    const { id: customerId } = useCustomerStore.getState().customer;
    localStorage.removeItem(activeSessionKey(customerId));
    set({ sessionId: null, messages: [], error: null, showSessionPanel: false });
  },

  deleteSession: async (id: string) => {
    const { sessions, sessionId } = get();
    const { id: customerId } = useCustomerStore.getState().customer;
    await apiDeleteSession(id).catch(() => {});
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(customerId, updated);
    set({ sessions: updated });
    if (sessionId === id) {
      localStorage.removeItem(activeSessionKey(customerId));
      set({ sessionId: null, messages: [] });
    }
  },

  clearError: () => set({ error: null }),

  toggleSessionPanel: () => set((s) => ({ showSessionPanel: !s.showSessionPanel })),
}));
