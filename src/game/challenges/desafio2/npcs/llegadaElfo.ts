import { DIALOG } from '../dialogs';
import { isElfoPresent } from '../mission';
import type { GameProgress } from '@/store/progressStore';

// Where the elf waits: by the giant tree, facing the valley (+z).
export const ELFO_POSITION: [number, number, number] = [-36.4, 10.2, -126.4];

// The story of the way to the elf's tree (02_narrador_00): told from this far, once the swamp was crossed and while
// nobody has spoken to him. It lasts SECONDS; he leaves his house SALE_ANTES seconds before it ends (the stairs are long).
export const LLEGADA = {
  id: 'elfo',
  dialog: DIALOG.llegada,
  center: ELFO_POSITION,
  radius: 30,
  pending: (progress: GameProgress) => isElfoPresent(progress) && !progress.interactedWithElfo,
} as const;
export const LLEGADA_SECONDS = 35.6;
export const SALE_ANTES = 16;
