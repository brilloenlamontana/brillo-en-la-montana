import { create } from 'zustand';

export type HelpAnswer = 'pending' | 'accepted' | 'rejected';

// Progreso de la Misión 1, guardado campo a campo en Firestore (users/{uid}.progress) con saveProgressToDB.
export interface GameProgress {
  openedMayorLetter: boolean;
  // Respuesta al aldeano: con 'accepted' Imeri espera frente a su casa; con 'rejected' no aparece.
  aldeanoHelp: HelpAnswer;
  // Habló con Imeri al menos una vez.
  interactedWithImeri: boolean;
  // Respuesta a Imeri: con 'accepted' se abre la puerta de su casa y se activa la mochila.
  imeriHelp: HelpAnswer;
  collectedItems: string[];
  golemDefeated: boolean;
  // Índices de los zumbadores que ya murieron.
  zumbadoresDefeated: number[];
  mision1Completada: boolean;
  mision1CompletadaEn?: string;
  [key: string]: boolean | string | number | string[] | number[] | undefined;
}

interface ProgressState {
  progress: GameProgress;
  setProgress: (progress: Partial<GameProgress>) => void;
  loadProgress: (saved: Partial<GameProgress> | undefined) => void;
  resetProgress: () => void;
}

const defaultProgress: GameProgress = {
  openedMayorLetter: false,
  aldeanoHelp: 'pending',
  interactedWithImeri: false,
  imeriHelp: 'pending',
  collectedItems: [],
  golemDefeated: false,
  zumbadoresDefeated: [],
  mision1Completada: false,
};

// Completa lo que falte en un progreso guardado. Antes no se le preguntaba nada a Imeri: quien ya había hablado con
// ella tenía la casa abierta, así que se toma como si hubiera aceptado su ayuda.
export function normalizeProgress(saved: Partial<GameProgress> | undefined): GameProgress {
  const progress = { ...defaultProgress, ...saved };
  if (!saved?.imeriHelp && saved?.interactedWithImeri) progress.imeriHelp = 'accepted';
  progress.collectedItems = Array.isArray(progress.collectedItems) ? progress.collectedItems : [];
  progress.zumbadoresDefeated = Array.isArray(progress.zumbadoresDefeated) ? progress.zumbadoresDefeated : [];
  return progress;
}

export const useProgressStore = create<ProgressState>((set) => ({
  progress: { ...defaultProgress },
  setProgress: (newProgress) =>
    set((state) => ({
      progress: { ...state.progress, ...newProgress } as GameProgress,
    })),
  loadProgress: (saved) => set({ progress: normalizeProgress(saved) }),
  resetProgress: () => set({ progress: { ...defaultProgress } }),
}));
