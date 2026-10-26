import { create } from 'zustand';

// Brief screen toast (item usage, insecticide ready, etc.). A new toast replaces the previous one.
interface ToastState {
  message: string | null;
  id: number;
  showToast: (message: string) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  id: 0,
  showToast: (message) => set((state) => ({ message, id: state.id + 1 })),
  hideToast: () => set({ message: null }),
}));
