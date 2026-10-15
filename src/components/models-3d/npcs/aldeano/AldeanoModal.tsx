import React from 'react';
import { useUIStore } from '../../../../store/uiStore';
import { useToastStore } from '../../../../store/toastStore';
import { saveProgressToDB } from '../../../../services/progressService';

export const ALDEANO_IMAGE_URL = '/sprites-2d/aseets/preguntas-aldeanos.png';

// Se dibuja en WorldPage, fuera del <Canvas>: abrirlo no toca la escena 3D.
export const AldeanoModal: React.FC = () => {
  const isAldeanoModalOpen = useUIStore((state) => state.isAldeanoModalOpen);
  const setAldeanoModalOpen = useUIStore((state) => state.setAldeanoModalOpen);

  if (!isAldeanoModalOpen) return null;

  // Se guarda en Firestore para que la decisión sobreviva a recargar la página. Con SÍ, Imeri pasa a esperar frente a
  // su casa; con NO, no está y su puerta sigue cerrada (se le puede volver a hablar al aldeano para cambiar de opinión).
  const handleYes = () => {
    saveProgressToDB(undefined, 'aldeanoHelp', 'accepted');
    setAldeanoModalOpen(false);
    useToastStore.getState().showToast('Imeri, la cazadora, te espera frente a su casa siguiendo el camino.');
  };

  const handleNo = () => {
    saveProgressToDB(undefined, 'aldeanoHelp', 'rejected');
    setAldeanoModalOpen(false);
    useToastStore.getState().showToast('Sin la ayuda del aldeano, Imeri no estará en su casa y su puerta seguirá cerrada.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 select-none">
      <div className="relative max-w-full max-h-[90vh] flex flex-col items-center justify-center">
        <img
          src={ALDEANO_IMAGE_URL}
          alt="Pregunta del Aldeano"
          className="max-w-full max-h-[70vh] sm:max-h-[80vh] object-contain drop-shadow-2xl pointer-events-none"
        />
        
        {/* Buttons overlay */}
        <div className="absolute bottom-[14%] sm:bottom-[18%] flex gap-4 sm:gap-10">
          <button 
            type="button"
            onClick={handleYes}
            className="px-6 py-1.5 sm:px-10 sm:py-2.5 text-lg sm:text-3xl font-bold cursor-pointer rounded-lg bg-[#5c3a21] text-[#f4d03f] border-2 border-[#3e2723] shadow-lg text-shadow hover:scale-105 active:scale-95 transition-transform"
          >
            SÍ
          </button>
          <button 
            type="button"
            onClick={handleNo}
            className="px-6 py-1.5 sm:px-10 sm:py-2.5 text-lg sm:text-3xl font-bold cursor-pointer rounded-lg bg-[#5c3a21] text-[#ff6b6b] border-2 border-[#3e2723] shadow-lg text-shadow hover:scale-105 active:scale-95 transition-transform"
          >
            NO
          </button>
        </div>
      </div>
    </div>
  );
};
