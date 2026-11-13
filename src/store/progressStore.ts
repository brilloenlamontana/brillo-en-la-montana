import { create } from 'zustand';

type HelpAnswer = 'pending' | 'accepted' | 'rejected';

// Stars for the whole game. Each defeat is a "bajo" (low academic performance) and costs one: the third one ends the
// run (see challenges/progression.ts).
export const STARS = 3;
// Each of the two bonuses gives one extra star (an extra life) on top of the three.
export const MAX_EXTRA_STARS = 2;

// Story progress, saved field by field in Firestore (users/{uid}.progress) by progressService.saveProgress.
// Grouped by challenge; the rules that read it live in each challenge's mission.ts.
export interface GameProgress {
  // --- Whole game (kept when the story starts over) ---
  // Stars left.
  estrellas: number;
  // Extra stars held right now (0 to 2): one is won with each bonus and they are lost before the three real ones.
  // Losing one is not a "bajo": the player just goes back to the start of the challenge.
  vidasExtra: number;
  // Extra stars lost so far.
  vidasExtraPerdidas: number;
  // Times the player was defeated, per challenge id.
  derrotas: Record<string, number>;
  // Times the story started over: 'segundoBajo' (back to Villa Boj from scratch) and 'tercerBajo' (new character).
  reinicios: Record<string, number>;

  // --- Story ---
  // Items picked up in any house.
  collectedItems: string[];
  // Arrival stories already told (see challenges/llegada.ts).
  historiasContadas: string[];

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
  // Bonus 1 (the statue of the ruined hut at the swamp exit): its moss cleaned, its fire lit, and the gold ring taken.
  estatuaLimpia: boolean;
  estatuaEncendida: boolean;
  bono1Completado: boolean;

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
  // Bonus 2 (the fairy's clearing): the brambles cut with the elven sword, and the fairy's amulet taken.
  hadaLiberada: boolean;
  bono2Completado: boolean;

  // Challenge 3
  // Reached Hedrig's mining town after the forest: the forest trail goes away and the backpack switches to hers.
  llegoAlPueblo: boolean;
  interactedWithHedrig: boolean;
  // Hedrig: with 'accepted' her door unlocks and her three items can be picked up.
  hedrigHelp: HelpAnswer;
  // The girl's spectre received her doll (Simona) and left in peace.
  espectroCalmado: boolean;
  // The Ogre lost the arm wrestling against the miner's glove and lets the player climb.
  ogroVencido: boolean;
  // Reached the summit through the tunnels.
  mision3Completada: boolean;
  mision3CompletadaEn?: string;

  // Closing story
  // Listened to the dryad at the sanctuary door: it unlocks.
  interactedWithDriada: boolean;
  calizTomado: boolean;
  juegoCompletado: boolean;
  juegoCompletadoEn?: string;
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
  historiasContadas: [],
  openedMayorLetter: false,
  aldeanoHelp: 'pending',
  interactedWithImeri: false,
  imeriHelp: 'pending',
  golemDefeated: false,
  zumbadoresDefeated: [],
  mision1Completada: false,
  mision1CompletadaEn: undefined,
  estatuaLimpia: false,
  estatuaEncendida: false,
  bono1Completado: false,
  interactedWithElfo: false,
  elfoHelp: 'pending',
  duendesDefeated: [],
  frutosComidos: [],
  mapaActivado: false,
  mision2Completada: false,
  mision2CompletadaEn: undefined,
  hadaLiberada: false,
  bono2Completado: false,
  llegoAlPueblo: false,
  interactedWithHedrig: false,
  hedrigHelp: 'pending',
  espectroCalmado: false,
  ogroVencido: false,
  mision3Completada: false,
  mision3CompletadaEn: undefined,
  interactedWithDriada: false,
  calizTomado: false,
  juegoCompletado: false,
  juegoCompletadoEn: undefined,
} as const satisfies Omit<GameProgress, 'estrellas' | 'vidasExtra' | 'vidasExtraPerdidas' | 'derrotas' | 'reinicios'>;

const DEFAULT_PROGRESS: GameProgress = {
  estrellas: STARS,
  vidasExtra: 0,
  vidasExtraPerdidas: 0,
  derrotas: {},
  reinicios: {},
  ...STORY_START,
  collectedItems: [],
  historiasContadas: [],
  zumbadoresDefeated: [],
  duendesDefeated: [],
  frutosComidos: [],
  mapaActivado: false,
  mision2Completada: false,
  mision2CompletadaEn: undefined,
};

// Flags added with Challenge 3, the two bonuses and the closing story.
const BOOLEAN_FLAGS = [
  'estatuaLimpia',
  'estatuaEncendida',
  'bono1Completado',
  'hadaLiberada',
  'bono2Completado',
  'llegoAlPueblo',
  'interactedWithHedrig',
  'espectroCalmado',
  'ogroVencido',
  'mision3Completada',
  'interactedWithDriada',
  'calizTomado',
  'juegoCompletado',
] as const satisfies readonly (keyof GameProgress)[];

const isRecord = (value: unknown): value is Record<string, number> => typeof value === 'object' && value !== null && !Array.isArray(value);
const list = <T,>(value: unknown): T[] => (Array.isArray(value) ? value : []);

// Fills the fields that older saves lack (e.g. imeriHelp did not exist when talking to Imeri meant accepting).
export function normalizeProgress(saved: Partial<GameProgress> | undefined): GameProgress {
  const progress = { ...DEFAULT_PROGRESS, ...saved };
  if (!saved?.imeriHelp && saved?.interactedWithImeri) progress.imeriHelp = 'accepted';
  const estrellas = Number(progress.estrellas);
  progress.estrellas = Number.isFinite(estrellas) ? Math.min(STARS, Math.max(1, Math.round(estrellas))) : STARS;
  const extra = Number(progress.vidasExtra);
  progress.vidasExtra = Number.isFinite(extra) ? Math.min(MAX_EXTRA_STARS, Math.max(0, Math.round(extra))) : 0;
  const perdidas = Number(progress.vidasExtraPerdidas);
  progress.vidasExtraPerdidas = Number.isFinite(perdidas) ? Math.max(0, Math.round(perdidas)) : 0;
  progress.derrotas = isRecord(progress.derrotas) ? progress.derrotas : {};
  progress.reinicios = isRecord(progress.reinicios) ? progress.reinicios : {};
  progress.collectedItems = list(progress.collectedItems);
  progress.historiasContadas = list(progress.historiasContadas);
  progress.zumbadoresDefeated = list(progress.zumbadoresDefeated);
  progress.duendesDefeated = list(progress.duendesDefeated);
  progress.frutosComidos = list(progress.frutosComidos);
  progress.mapaActivado = Boolean(progress.mapaActivado);
  progress.mision2Completada = Boolean(progress.mision2Completada);
  // Saves from before Challenge 3, the bonuses and the closing story lack their fields (or hold something else).
  if (progress.hedrigHelp !== 'accepted' && progress.hedrigHelp !== 'rejected') progress.hedrigHelp = 'pending';
  for (const flag of BOOLEAN_FLAGS) progress[flag] = progress[flag] === true;
  // Reaching the summit is only possible past the Ogre, and the chalice ends the game.
  if (progress.calizTomado) progress.juegoCompletado = true;
  if (progress.juegoCompletado) progress.mision3Completada = true;
  if (progress.mision3Completada) progress.ogroVencido = true;
  return progress;
}

export const useProgressStore = create<ProgressState>((set) => ({
  progress: DEFAULT_PROGRESS,
  setProgress: (changes) => set((state) => ({ progress: { ...state.progress, ...changes } })),
  loadProgress: (saved) => set({ progress: normalizeProgress(saved) }),
  resetProgress: () => set({ progress: DEFAULT_PROGRESS }),
}));
