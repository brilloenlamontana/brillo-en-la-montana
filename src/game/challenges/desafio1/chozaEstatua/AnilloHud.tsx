import { useChozaStore } from './limpieza';

const TEXTO = {
  camino: 'Te acercas a las manos de la estatua…',
  alcanza: 'Extiendes las manos hacia el anillo de oro…',
  alza: 'Tomas el anillo: aún está tibio por el fuego',
  mira: 'Lo miras a la luz de las llamas',
} as const;

// Taking the ring, over the canvas: it covers the whole screen, so the camera cannot be turned while the avatar does
// it, and says what is happening. Nothing to press. No backdrop blur over the canvas.
export function AnilloHud() {
  const fase = useChozaStore((state) => state.anillo?.fase ?? null);
  if (fase === null) return null;
  return (
    <div className="absolute inset-0 z-30 select-none touch-none" aria-live="polite">
      <div className="absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom,18px))] flex justify-center px-4 pointer-events-none">
        <p className="max-w-xl text-center bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-4 py-2 shadow-xl font-serif font-bold text-sm sm:text-lg">{TEXTO[fase]}</p>
      </div>
    </div>
  );
}
