import { create } from 'zustand';

interface UIState {
  isAnnouncementOpen: boolean;
  setAnnouncementOpen: (isOpen: boolean) => void;
  isAldeanoModalOpen: boolean;
  setAldeanoModalOpen: (isOpen: boolean) => void;
  isImeriModalOpen: boolean;
  setImeriModalOpen: (isOpen: boolean) => void;
  isBackpackOpen: boolean;
  setBackpackOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAnnouncementOpen: false,
  setAnnouncementOpen: (isOpen) => set({ isAnnouncementOpen: isOpen }),
  isAldeanoModalOpen: false,
  setAldeanoModalOpen: (isOpen) => set({ isAldeanoModalOpen: isOpen }),
  isImeriModalOpen: false,
  setImeriModalOpen: (isOpen) => set({ isImeriModalOpen: isOpen }),
  isBackpackOpen: false,
  setBackpackOpen: (isOpen) => set({ isBackpackOpen: isOpen }),
}));
