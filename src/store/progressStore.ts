import { create } from 'zustand';

type HelpAnswer = 'pending' | 'accepted' | 'rejected';

// Every challenge starts with this many stars; each defeat costs one.
export const STARS_PER_CHALLENGE = 3;

// Story progress, saved field by field in Firestore (users/{uid}.progress) by progressService.saveProgress.
// Grouped by challenge; the rules that read it live in each challenge's mission.ts.
export interface GameProgress {
  // --- Every challenge ---
  // Stars left in the challenge being played.
  estrellas: number;
  // Times the player was defeated, and times they lost every star (the challenge restarted), per challenge id.
  derrotas: Record<string, number>;
  reinicios: Record<string, number>;
  // Items picked up in any house.
  collectedItems: string[];

  // --- Challenge 1 ---
  openedMayorLetter: boolean;
  // Villager: with 'accepted' Imeri waits in front of her house; with 'rejected' she is not there.
  aldeanoHelp: HelpAnswer;
  // Spoke with Imeri at least once.
  interactedWithImeri: boolean;
  // Imeri: with 'accepted' her door unlocks and the backpack becomes active.
  imeriHelp: HelpAnswer;
  golemDefeated: boolean;
  // Indices of the defeated zumbadores.
  zumbadoresDefeated: number[];
  mision1Completada: boolean;
  mision1CompletadaEn?: string;

  // --- Challenge 2 ---
  interactedWithElfo: boolean;
  // Elf: with 'accepted' his door unlocks and the backpack switches to his tools.
  elfoHelp: HelpAnswer;
}

interface ProgressState {
  progress: GameProgress;
  setProgress: (changes: Partial<GameProgress>) => void;
  loadProgress: (saved: Partial<GameProgress> | undefined) => void;
  resetProgress: () => void;
}

const DEFAULT_PROGRESS: GameProgress = {
  estrellas: STARS_PER_CHALLENGE,
  derrotas: {},
  reinicios: {},
  collectedItems: [],
  openedMayorLetter: false,
  aldeanoHelp: 'pending',
  interactedWithImeri: false,
  imeriHelp: 'pending',
  golemDefeated: false,
  zumbadoresDefeated: [],
  mision1Completada: false,
  interactedWithElfo: false,
  elfoHelp: 'pending',
};

const isRecord = (value: unknown): value is Record<string, number> => typeof value === 'object' && value !== null && !Array.isArray(value);

// Fills the fields that older saves lack (e.g. imeriHelp did not exist when talking to Imeri meant accepting).
export function normalizeProgress(saved: Partial<GameProgress> | undefined): GameProgress {
  const progress = { ...DEFAULT_PROGRESS, ...saved };
  if (!saved?.imeriHelp && saved?.interactedWithImeri) progress.imeriHelp = 'accepted';
  const estrellas = Number(progress.estrellas);
  progress.estrellas = Number.isFinite(estrellas) ? Math.min(STARS_PER_CHALLENGE, Math.max(1, Math.round(estrellas))) : STARS_PER_CHALLENGE;
  progress.derrotas = isRecord(progress.derrotas) ? progress.derrotas : {};
  progress.reinicios = isRecord(progress.reinicios) ? progress.reinicios : {};
  progress.collectedItems = Array.isArray(progress.collectedItems) ? progress.collectedItems : [];
  progress.zumbadoresDefeated = Array.isArray(progress.zumbadoresDefeated) ? progress.zumbadoresDefeated : [];
  return progress;
}

export const useProgressStore = create<ProgressState>((set) => ({
  progress: DEFAULT_PROGRESS,
  setProgress: (changes) => set((state) => ({ progress: { ...state.progress, ...changes } })),
  loadProgress: (saved) => set({ progress: normalizeProgress(saved) }),
  resetProgress: () => set({ progress: DEFAULT_PROGRESS }),
}));
