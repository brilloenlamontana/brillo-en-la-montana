import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// Opens the mayor's letter and records the first reading.
export function openCartaAlcalde() {
  useUIStore.getState().openDialog(DIALOG.cartaAlcalde);
  if (!useProgressStore.getState().progress.openedMayorLetter) saveProgress({ openedMayorLetter: true });
}
