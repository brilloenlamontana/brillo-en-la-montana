import { create } from 'zustand';

export interface GameProgress {
  openedMayorLetter: boolean;
  interactedWithImeri: boolean;
  aldeanoHelp: 'pending' | 'accepted' | 'rejected';
  collectedItems: string[];
  [key: string]: boolean | string | number | string[]; // For future extensibility
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
  collectedItems: [],
};

export const useProgressStore = create<ProgressState>((set) => ({
  progress: { ...defaultProgress },
  setProgress: (newProgress) => set((state: any) => ({
    progress: { ...state.progress, ...newProgress }
  })),
  resetProgress: () => set({ progress: { ...defaultProgress } }),
}));
