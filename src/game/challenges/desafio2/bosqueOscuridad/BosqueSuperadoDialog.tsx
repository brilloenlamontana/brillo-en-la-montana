import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// Challenge 2 completed: goblins defeated, fed with safe fruits, and the mountain pass cleared with the map.
// Only a short cheer: the story of the way there is told on arriving at the next house (see challenges/llegada.ts).
const GRITO = ['¡Atravesaste el Bosque de la Oscuridad!'];

export function BosqueSuperadoDialog() {
  const isOpen = useDialogOpen(DIALOG.bosqueSuperado);
  if (!isOpen) return null;

  return (
    <ParchmentDialog title="Desafío 2 superado" subtitle="Bosque de la Oscuridad" paragraphs={GRITO} voice={['02_narrador_15']} onClose={() => useUIStore.getState().closeDialog()} />
  );
}
