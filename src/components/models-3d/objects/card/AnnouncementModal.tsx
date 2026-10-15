import React from 'react';
import { useUIStore } from '../../../../store/uiStore';

export const MAYOR_ANNOUNCEMENT_IMAGE_URL = '/sprites-2d/aseets/mayor-announcement.png';

// Se dibuja en WorldPage, fuera del <Canvas>. Card.tsx guarda en el progreso que se leyó al abrirlo.
export const AnnouncementModal: React.FC = () => {
  const isAnnouncementOpen = useUIStore((state) => state.isAnnouncementOpen);
  const setAnnouncementOpen = useUIStore((state) => state.setAnnouncementOpen);

  if (!isAnnouncementOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 select-none">
      <div className="relative max-w-full max-h-[90vh] flex items-center justify-center">
        <button
          type="button"
          onClick={() => setAnnouncementOpen(false)}
          className="absolute -top-2 -right-2 sm:top-2 sm:right-2 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold cursor-pointer drop-shadow-md hover:scale-110 active:scale-95 transition-all"
          aria-label="Cerrar anuncio"
        >
          &times;
        </button>
        <img
          src={MAYOR_ANNOUNCEMENT_IMAGE_URL}
          alt="Mayor Announcement"
          className="max-w-full max-h-[82vh] object-contain drop-shadow-2xl pointer-events-none"
        />
      </div>
    </div>
  );
};
