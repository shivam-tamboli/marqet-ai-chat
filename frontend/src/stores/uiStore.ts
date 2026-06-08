import { create } from 'zustand';

interface UIState {
  isWidgetOpen: boolean;
  toggleWidget: () => void;
  closeWidget: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isWidgetOpen: false,
  toggleWidget: () => set((s) => ({ isWidgetOpen: !s.isWidgetOpen })),
  closeWidget: () => set({ isWidgetOpen: false }),
}));
