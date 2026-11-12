import { useEffect } from 'react';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { ParchmentButton, ParchmentDialog } from '@/game/hud/ParchmentDialog';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { CARTA_ALCALDE_IMAGE } from '../assets';
import { DIALOG } from '../dialogs';
import { openCartaAlcalde } from './openCartaAlcalde';

// What the announcement says (the text of the image), as the mayor's voice reads it.
const ANUNCIO = [
  'Se ha avistado un resplandor verde en La Cumbre de la Desesperación. Se buscan valientes que se atrevan a enfrentar los peligros del camino y que recuperen el tesoro de nuestro pueblo. La vida de nuestra gente está en sus manos...',
];

// The mayor's announcement: its picture over the world and, in the text box below, what it says as his voice reads it.
// The first time the player enters the world it opens by itself as soon as the loading screen goes away: the story
// starts by reading it.
export function CartaAlcaldeDialog() {
  const isOpen = useDialogOpen(DIALOG.cartaAlcalde);
  const ready = useWorldStore((state) => state.ready);
  const read = useProgressStore((state) => state.progress.openedMayorLetter);

  // It waits for whatever dialog is open (the story starts over after a second or third bajo, whose dialog comes first).
  const busy = useUIStore((state) => state.dialog !== null);

  useEffect(() => {
    if (ready && !read && !busy) openCartaAlcalde();
  }, [ready, read, busy]);

  // The image is decoded ahead, so opening it later does not drop frames.
  useEffect(() => {
    const image = new Image();
    image.src = CARTA_ALCALDE_IMAGE;
    image.decode().catch(() => undefined);
  }, []);

  if (!isOpen) return null;

  const close = () => {
    useUIStore.getState().closeDialog();
    if (useProgressStore.getState().progress.aldeanoHelp === 'pending') {
      useToastStore.getState().showToast('Cruza el portón de la Villa de Boj y habla con el aldeano de la plaza.');
    }
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 bottom-[11.5rem] z-40 flex items-center justify-center p-3 pointer-events-none select-none">
        <img src={CARTA_ALCALDE_IMAGE} alt="Anuncio del alcalde" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
      </div>
      <ParchmentDialog title="Anuncio del alcalde" subtitle="Clavado en el tablón de la Villa de Boj" paragraphs={ANUNCIO} voice={['00_alcalde_01']}>
        <div className="flex justify-end">
          <ParchmentButton onClick={close}>Guardar el anuncio</ParchmentButton>
        </div>
      </ParchmentDialog>
    </>
  );
}
