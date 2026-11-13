import { ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';

// What the announcement says, as the mayor's voice reads it.
const ANUNCIO = [
  'Se ha avistado un resplandor verde en La Cumbre de la Desesperación. Se buscan valientes que se atrevan a enfrentar los peligros del camino y que recuperen el tesoro de nuestro pueblo. La vida de nuestra gente está en sus manos...',
];

// The mayor's announcement, written in the narration scroll as his voice reads it. It opens when the player reads the
// notice board by the gate (CartaAlcalde), never by itself: the game starts with the player walking.
export function CartaAlcaldeDialog() {
  const isOpen = useDialogOpen(DIALOG.cartaAlcalde);
  if (!isOpen) return null;

  const close = () => {
    useUIStore.getState().closeDialog();
    if (useProgressStore.getState().progress.aldeanoHelp === 'pending') {
      useToastStore.getState().showToast('Cruza el portón de la Villa de Boj y habla con la aldeana junto al pozo de la plaza.');
    }
  };

  return (
    <ParchmentDialog title="Anuncio del alcalde" paragraphs={ANUNCIO} voice={['00_alcalde_01']} onClose={close} />
  );
}
