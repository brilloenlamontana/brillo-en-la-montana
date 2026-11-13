import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from './dialogs';

// Challenge 3 completed: the player came out of the tunnels onto the summit (health back to full).
// Only a short cheer: the story of the way there is told on arriving at the next house (see challenges/llegada.ts).
const GRITO = ['¡Llegaste a la Cumbre de la Desolación!'];

export function CumbreAlcanzadaDialog() {
  const isOpen = useDialogOpen(DIALOG.cumbre);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="Desafío 3 superado" subtitle="Tu vida se recuperó al 100 %" paragraphs={GRITO} voice={['03_narrador_14']} onClose={() => useUIStore.getState().closeDialog()} />
  );
}
