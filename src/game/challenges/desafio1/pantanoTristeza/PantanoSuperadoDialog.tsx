import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// Challenge 1 completed: the golem is off and the zumbadores are gone.
// Only a short cheer: the story of the way there is told on arriving at the next house (see challenges/llegada.ts).
const GRITO = ['¡Atravesaste el Pantano de la Tristeza!'];

export function PantanoSuperadoDialog() {
  const isOpen = useDialogOpen(DIALOG.pantanoSuperado);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="Desafío 1 superado" subtitle="Pantano de la Tristeza" paragraphs={GRITO} voice={['01_narrador_10']} onClose={() => useUIStore.getState().closeDialog()} />
  );
}
