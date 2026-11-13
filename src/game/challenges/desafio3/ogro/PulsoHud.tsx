import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useTunelStore } from '../tunelStore';
import { empujarPulso, pulsoVivo } from './pulso';

// Keys that push like a click.
const PUSH_KEYS = new Set([' ', 'Enter', 'e', 'E']);

// The arm wrestling with the Ogre, over the canvas: it covers the whole screen, so the camera cannot be turned, and
// every click, tap or key on it is a push. A bar shows who is winning: it fills toward the Ogre's side as the player
// pushes. No backdrop blur over the canvas.
export function PulsoHud() {
  const fase = useTunelStore((state) => state.pulso?.fase ?? null);
  const mobile = useIsMobile();
  const bar = useRef<HTMLDivElement>(null);
  const jugando = fase === 'juego';

  // The bar follows the strength every frame without re-rendering.
  useEffect(() => {
    if (fase === null) return;
    let frame = 0;
    const tick = () => {
      if (bar.current) bar.current.style.width = `${Math.round(pulsoVivo.fuerza * 1000) / 10}%`;
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [fase]);

  useEffect(() => {
    if (!jugando) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || !PUSH_KEYS.has(event.key)) return;
      event.preventDefault();
      empujarPulso();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jugando]);

  if (fase === null) return null;

  const texto =
    fase === 'camino' || fase === 'acomodo'
      ? 'El ogro y tú se acomodan en la mesa…'
      : fase === 'juego'
        ? mobile
          ? '¡Toca la pantalla muchas veces, rápido, para doblarle el brazo!'
          : '¡Haz clic muchas veces, rápido, para doblarle el brazo!'
        : fase === 'gana'
          ? '¡Le doblaste el brazo al ogro!'
          : '¡El ogro te dobló el brazo! Te hace falta el guante de minero de Hedrig.';

  return (
    <div className="absolute inset-0 z-30 select-none touch-none cursor-pointer" onPointerDown={empujarPulso} role="button" aria-label="Empujar en el pulso con el ogro">
      <div className="absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom,18px))] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <p className="max-w-xl text-center bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-4 py-2 shadow-xl font-serif font-bold text-sm sm:text-lg">{texto}</p>
        <div className="w-full max-w-md flex items-center gap-2 text-[11px] sm:text-xs font-bold text-white drop-shadow">
          <span>Tú</span>
          <div className="flex-1 h-4 sm:h-5 rounded-full border-2 border-[#3e2723] bg-lime-800/90 overflow-hidden shadow-lg">
            <div ref={bar} className="h-full bg-[#f4d03f]" style={{ width: '50%' }} />
          </div>
          <span>Ogro</span>
        </div>
      </div>
    </div>
  );
}
