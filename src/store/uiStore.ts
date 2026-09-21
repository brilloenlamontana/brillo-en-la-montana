import { create } from 'zustand';

interface UIState {
  isAnnouncementOpen: boolean;
  setAnnouncementOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAnnouncementOpen: false,
  setAnnouncementOpen: (isOpen) => set({ isAnnouncementOpen: isOpen }),
}));
