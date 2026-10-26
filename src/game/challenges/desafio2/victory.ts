import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore, type GameProgress } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from './dialogs';
import { allDuendesDefeated, isFed, isMapaActivado } from './mission';

// Saves progress for Challenge 2. If this change completes the challenge (goblins defeated, fed with good fruits,
// and the hidden wall lowered with the map), it marks mision2Completada, restores health to 100, toasts the victory,
// and displays the narrative summary dialog.
export function saveDesafio2Victory(changes: Partial<GameProgress>): boolean {
  const current = useProgressStore.getState().progress;
  const next = { ...current, ...changes };
  const completedNow = !current.mision2Completada && allDuendesDefeated(next) && isFed(next) && isMapaActivado(next);
  if (completedNow) {
    changes.mision2Completada = true;
    changes.mision2CompletadaEn = new Date().toISOString();
    usePlayerStore.getState().restoreHealth();
    useToastStore.getState().showToast('¡Superaste el Desafío 2: Bosque de la Oscuridad! Tu vida se recuperó al 100%.');
    useUIStore.getState().openDialog(DIALOG.bosqueSuperado);
  }
  saveProgress(changes);
  return completedNow;
}
