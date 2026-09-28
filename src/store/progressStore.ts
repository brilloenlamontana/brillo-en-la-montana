import { create } from 'zustand';

export interface GameProgress {
  openedMayorLetter: boolean;
  interactedWithImeri: boolean;
  aldeanoHelp: 'pending' | 'accepted' | 'rejected';
  [key: string]: boolean | string | number; // For future extensibility
}

interface ProgressState {
  progress: GameProgress;
  setProgress: (progress: Partial<GameProgress>) => void;
  resetProgress: () => void;
}

const defaultProgress: GameProgress = {
  openedMayorLetter: false,
  interactedWithImeri: false,
  aldeanoHelp: 'pending',
};

export const useProgressStore = create<ProgressState>((set) => ({
  progress: { ...defaultProgress },
  setProgress: (newProgress) => set((state: any) => ({
    progress: { ...state.progress, ...newProgress }
  })),
  resetProgress: () => set({ progress: { ...defaultProgress } }),
}));
