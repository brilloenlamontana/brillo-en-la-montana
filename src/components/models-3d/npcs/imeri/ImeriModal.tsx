import React from 'react';
import { useUIStore } from '../../../../store/uiStore';
import { useProgressStore } from '../../../../store/progressStore';
import { useToastStore } from '../../../../store/toastStore';
import { saveProgress } from '../../../../services/progressService';

// Texto de la "Audio explicación de Imeri" (docs/cronograma-de-escenas.md).
const IMERI_EXPLICACION = [
  'El Pantano de la Tristeza hace honor a su nombre, es un lugar miserable. Al formar parte del Delta del Gran Río, las corrientes siempre fluyen con fuerza, cambiando los senderos con frecuencia, lo que imposibilita hacer un mapa.',
  'Los senderos embarrados a veces desaparecen sin aviso y los suelos se licúan dejando pozos que parecen poco profundos, pero que se tragan a veces a los animales e incluso a los borrachos desprevenidos que se aventuran sin saberlo. Entrar solo, sin alguien que te pueda sacar de un apuro, es mortal; lo mejor es ir atado a alguien que te pueda sacar de un lodazal.',
  'La mayoría de los que intentan atravesarlo cuentan que hubieran podido soportarlo todo con más valentía si no fuera por los insectos: el pantano está plagado de unos mosquitos gigantes que los pueblerinos llaman Zumbones, cuya picadura produce fiebres y terribles dolores por varios días. Una sola picadura no es mortal, pero los Zumbones nunca pican una sola vez.',
  'Entre las amenazas más temidas por los cazadores hay algo particularmente amenazante: un Golem Gigante, una feroz criatura creada hace cientos de años por un mago que ya murió. El secreto de cómo desactivarlo o controlarlo murió con su creador. Se cuenta que el Golem emite una gran luz roja en el centro del pecho.',
];


// Se dibuja en WorldPage, fuera del <Canvas>. Imeri cuenta los peligros del pantano y ofrece su ayuda: solo si el jugador
// la acepta se abre la puerta de su casa (para recoger la gema, la soga y las pociones) y se activa la mochila.
export const ImeriModal: React.FC = () => {
  const isImeriModalOpen = useUIStore((state) => state.isImeriModalOpen);
  const setImeriModalOpen = useUIStore((state) => state.setImeriModalOpen);
  const accepted = useProgressStore((state) => state.progress.imeriHelp === 'accepted');

  if (!isImeriModalOpen) return null;

  const answer = (help: 'accepted' | 'rejected') => {
    saveProgress({ interactedWithImeri: true, imeriHelp: help });
    setImeriModalOpen(false);
    useToastStore
      .getState()
      .showToast(
        help === 'accepted'
          ? 'Imeri abrió su casa y se activó tu mochila: entra y recoge lo que te sirva.'
          : 'La puerta de la casa de Imeri seguirá cerrada. Puedes volver a hablar con ella.',
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 select-none">
      <div
        role="dialog"
        aria-labelledby="imeri-titulo"
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[#f4e4bc] text-[#3e2723] border-2 sm:border-[3px] border-[#5c3a21] rounded-2xl shadow-2xl p-4 sm:p-7 font-serif"
      >
        <h2 id="imeri-titulo" className="text-xl sm:text-2xl font-bold mb-1 text-[#3e2723]">Imeri</h2>
        <p className="italic text-[#5c3a21] text-xs sm:text-sm mb-4">La cazadora que mejor conoce el pantano</p>
        
        <div className="space-y-3 text-xs sm:text-sm leading-relaxed font-sans">
          {IMERI_EXPLICACION.map((paragraph) => (
            <p key={paragraph.slice(0, 24)}>{paragraph}</p>
          ))}
        </div>

        {accepted ? (
          <div className="flex justify-end mt-5">
            <button
              type="button"
              onClick={() => setImeriModalOpen(false)}
              className="px-5 py-2 sm:px-6 sm:py-2.5 text-sm sm:text-base font-bold cursor-pointer rounded-lg bg-[#5c3a21] text-[#f4d03f] border-2 border-[#3e2723] shadow-md hover:scale-105 active:scale-95 transition-transform"
            >
              Entendido
            </button>
          </div>
        ) : (
          <div className="mt-5 pt-3 border-t border-[#5c3a21]/20">
            <p className="font-bold text-sm sm:text-base text-[#3e2723] mb-3">
              ¿Quieres que te ayude? En mi casa tengo lo que necesitas para cruzar el pantano.
            </p>
            <div className="flex justify-end flex-wrap gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => answer('rejected')}
                className="px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold cursor-pointer rounded-lg bg-[#5c3a21] text-[#ff6b6b] border-2 border-[#3e2723] shadow-md hover:scale-105 active:scale-95 transition-transform"
              >
                No, gracias
              </button>
              <button
                type="button"
                onClick={() => answer('accepted')}
                className="px-4 py-2 sm:px-5 sm:py-2.5 text-sm sm:text-base font-bold cursor-pointer rounded-lg bg-[#5c3a21] text-[#f4d03f] border-2 border-[#3e2723] shadow-md hover:scale-105 active:scale-95 transition-transform"
              >
                Sí, ayúdame
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
