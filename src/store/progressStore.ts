import { create } from 'zustand';

type HelpAnswer = 'pending' | 'accepted' | 'rejected';

// Stars for the whole game. Each defeat is a "bajo" (low academic performance) and costs one: the third one ends the
// run (see challenges/progression.ts).
export const STARS = 3;

// Story progress, saved field by field in Firestore (users/{uid}.progress) by progressService.saveProgress.
// Grouped by challenge; the rules that read it live in each challenge's mission.ts.
export interface GameProgress {
  // --- Whole game (kept when the story starts over) ---
  // Stars left.
  estrellas: number;
  // Times the player was defeated, per challenge id.
  derrotas: Record<string, number>;
  // Times the story started over: 'segundoBajo' (back to Villa Boj from scratch) and 'tercerBajo' (new character).
  reinicios: Record<string, number>;

  // --- Story ---
  // Items picked up in any house.
  collectedItems: string[];

  // Challenge 1
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

  // Challenge 2
  interactedWithElfo: boolean;
  // Elf: with 'accepted' his door unlocks and the backpack switches to his tools.
  elfoHelp: HelpAnswer;
  // Indices of the defeated goblins of the Dark Forest.
  duendesDefeated: number[];
  // Indices of the good fruits of the Dark Forest already eaten.
  frutosComidos: number[];
  // Forest map activated: reveals the hidden mountain path by lowering the rock wall.
  mapaActivado: boolean;
  mision2Completada: boolean;
  mision2CompletadaEn?: string;
}

interface ProgressState {
  progress: GameProgress;
  setProgress: (changes: Partial<GameProgress>) => void;
  loadProgress: (saved: Partial<GameProgress> | undefined) => void;
  resetProgress: () => void;
}

// The story from the very beginning (everything except the whole-game fields).
export const STORY_START = {
  collectedItems: [],
  openedMayorLetter: false,
  aldeanoHelp: 'pending',
  interactedWithImeri: false,
  imeriHelp: 'pending',
  golemDefeated: false,
  zumbadoresDefeated: [],
  mision1Completada: false,
  mision1CompletadaEn: undefined,
  interactedWithElfo: false,
  elfoHelp: 'pending',
  duendesDefeated: [],
  frutosComidos: [],
  mapaActivado: false,
  mision2Completada: false,
  mision2CompletadaEn: undefined,
} as const satisfies Omit<GameProgress, 'estrellas' | 'derrotas' | 'reinicios'>;

const DEFAULT_PROGRESS: GameProgress = {
  estrellas: STARS,
  derrotas: {},
  reinicios: {},
  ...STORY_START,
  collectedItems: [],
  zumbadoresDefeated: [],
  duendesDefeated: [],
  frutosComidos: [],
  mapaActivado: false,
  mision2Completada: false,
  mision2CompletadaEn: undefined,
};

const isRecord = (value: unknown): value is Record<string, number> => typeof value === 'object' && value !== null && !Array.isArray(value);
const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

// Fills the fields that older saves lack (e.g. imeriHelp did not exist when talking to Imeri meant accepting).
export function normalizeProgress(saved: Partial<GameProgress> | undefined): GameProgress {
  const progress = { ...DEFAULT_PROGRESS, ...saved };
  if (!saved?.imeriHelp && saved?.interactedWithImeri) progress.imeriHelp = 'accepted';
  const estrellas = Number(progress.estrellas);
  progress.estrellas = Number.isFinite(estrellas) ? Math.min(STARS, Math.max(1, Math.round(estrellas))) : STARS;
  progress.derrotas = isRecord(progress.derrotas) ? progress.derrotas : {};
  progress.reinicios = isRecord(progress.reinicios) ? progress.reinicios : {};
  progress.collectedItems = list(progress.collectedItems);
  progress.zumbadoresDefeated = list(progress.zumbadoresDefeated);
  progress.duendesDefeated = list(progress.duendesDefeated);
  progress.frutosComidos = list(progress.frutosComidos);
  progress.mapaActivado = Boolean(progress.mapaActivado);
  progress.mision2Completada = Boolean(progress.mision2Completada);
  return progress;
}

export const useProgressStore = create<ProgressState>((set) => ({
  progress: DEFAULT_PROGRESS,
  setProgress: (changes) => set((state) => ({ progress: { ...state.progress, ...changes } })),
  loadProgress: (saved) => set({ progress: normalizeProgress(saved) }),
  resetProgress: () => set({ progress: DEFAULT_PROGRESS }),
}));
