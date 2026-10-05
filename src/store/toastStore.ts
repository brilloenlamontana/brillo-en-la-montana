import { create } from 'zustand';

// Aviso corto en pantalla (resultado de usar un objeto, insecticida preparado, etc.). Uno nuevo reemplaza al anterior.
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
