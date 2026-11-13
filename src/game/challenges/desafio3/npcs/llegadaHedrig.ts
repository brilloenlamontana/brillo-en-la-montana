import { DIALOG } from '../dialogs';
import { isUnlocked } from '../mission';
import type { GameProgress } from '@/store/progressStore';

// Where Hedrig waits: outside, beside the campfire in front of her house (the ground rises there to 23.8: measured in
// game).
export const HEDRIG_POSITION: [number, number, number] = [82.6, 23.84, -206.3];

// The story of the way to the mining town (03_narrador_00): told from this far, once the forest was crossed and while
// nobody has spoken to her. It lasts SECONDS; she leaves her house SALE_ANTES seconds before it ends.
export const LLEGADA = {
  id: 'hedrig',
  dialog: DIALOG.llegada,
  center: HEDRIG_POSITION,
  radius: 15,
  pending: (progress: GameProgress) => isUnlocked(progress) && !progress.interactedWithHedrig,
} as const;
export const LLEGADA_SECONDS = 36;
export const SALE_ANTES = 6;
