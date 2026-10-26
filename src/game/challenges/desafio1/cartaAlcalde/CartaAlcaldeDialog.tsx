import { useEffect } from 'react';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useDialogOpen, useUIStore } from '@/store/uiStore';
import { CARTA_ALCALDE_IMAGE } from '../assets';
import { DIALOG } from '../dialogs';
import { openCartaAlcalde } from './openCartaAlcalde';

// The mayor's announcement, full screen. The first time the player enters the world it opens by itself as soon as the
// loading screen goes away: the story starts by reading it.
export function CartaAlcaldeDialog() {
  const isOpen = useDialogOpen(DIALOG.cartaAlcalde);
  const ready = useWorldStore((state) => state.ready);
  const read = useProgressStore((state) => state.progress.openedMayorLetter);

  useEffect(() => {
    if (ready && !read) openCartaAlcalde();
  }, [ready, read]);

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
      useToastStore.getState().showToast('Cruza el portón de Villa Boj y habla con el aldeano de la plaza.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 sm:p-4 select-none">
      <div className="relative max-w-full max-h-[90vh] flex items-center justify-center">
        <button
          type="button"
          onClick={close}
          className="absolute -top-2 -right-2 sm:top-2 sm:right-2 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold cursor-pointer drop-shadow-md hover:scale-110 active:scale-95 transition-all"
          aria-label="Cerrar anuncio"
        >
          &times;
        </button>
        <img
          src={CARTA_ALCALDE_IMAGE}
          alt="Anuncio del alcalde"
          className="max-w-full max-h-[82vh] object-contain drop-shadow-2xl pointer-events-none"
        />
      </div>
    </div>
  );
}
