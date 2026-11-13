import type { GameProgress } from '@/store/progressStore';
import { DIALOG } from '../dialogs';
import { isCalizTomado, isSantuarioAbierto } from '../mission';
import { useRitualStore } from './ritual';

// The story of the summit (04_narrador_00): told from this far of the plaza of the sanctuary, once the summit was
// reached and while the dryad has not been spoken to. It lasts SECONDS; she comes out SALE_ANTES seconds before it ends.
export const LLEGADA = {
  id: 'santuario',
  dialog: DIALOG.llegada,
  center: [149.7, 51.86, -150.2],
  radius: 30,
  pending: (progress: GameProgress) =>
    progress.mision3Completada && !isSantuarioAbierto(progress) && !isCalizTomado(progress) && useRitualStore.getState().fase === 'reposo',
} as const;
export const LLEGADA_SECONDS = 42.7;
export const SALE_ANTES = 4;
