import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { frotar, limpiezaViva, terminarLimpieza, useChozaStore, ZONAS } from './limpieza';

// Keys that rub while held, like the pointer.
const RUB_KEYS = new Set([' ', 'Enter', 'e', 'E']);
const NOMBRES = ['Frente', 'Ojos', 'Boca'] as const;

// Cleaning the statue's face, over the canvas: it covers the whole screen, so the camera cannot be turned, and holding
// the pointer (or a key) anywhere on it rubs. Three bars show the zones of moss coming off. No backdrop blur over the
// canvas.
export function LimpiezaHud() {
  const fase = useChozaStore((state) => state.limpieza?.fase ?? null);
  const mobile = useIsMobile();
  const bars = useRef<(HTMLDivElement | null)[]>([]);
  const frotando = fase === 'frota';

  // The bars follow the cleaning every frame without re-rendering.
  useEffect(() => {
    if (fase === null) return;
    let frame = 0;
    const tick = () => {
      bars.current.forEach((bar, i) => {
        if (bar) bar.style.width = `${Math.round(Math.min(1, Math.max(0, limpiezaViva.avance - i)) * 1000) / 10}%`;
      });
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [fase]);

  useEffect(() => {
    if (!frotando) return;
    const onDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return terminarLimpieza();
      if (!RUB_KEYS.has(event.key)) return;
      event.preventDefault();
      frotar(true);
    };
    const onUp = (event: KeyboardEvent) => {
      if (RUB_KEYS.has(event.key)) frotar(false);
    };
    const release = () => frotar(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', release);
      release();
    };
  }, [frotando]);

  if (fase === null) return null;

  const texto =
    fase === 'camino'
      ? 'Te acercas a la estatua con un trapo viejo…'
      : fase === 'frota'
        ? mobile
          ? 'Mantén el dedo en la pantalla para frotar el moho de su rostro'
          : 'Mantén presionado el clic (o la tecla E) para frotar el moho de su rostro'
        : 'El rostro de la estatua quedó limpio';

  return (
    <div
      className="absolute inset-0 z-30 select-none touch-none cursor-pointer"
      onPointerDown={() => frotar(true)}
      onPointerUp={() => frotar(false)}
      onPointerLeave={() => frotar(false)}
      onPointerCancel={() => frotar(false)}
      onContextMenu={(event) => event.preventDefault()}
      role="button"
      aria-label="Frotar el moho del rostro de la estatua"
    >
      {frotando && (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={terminarLimpieza}
          className="absolute top-[max(64px,calc(env(safe-area-inset-top,12px)+52px))] right-[max(12px,env(safe-area-inset-right,12px))] bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-serif font-bold shadow-lg cursor-pointer hover:bg-[#ead7a4]"
        >
          Dejar de limpiar
        </button>
      )}
      <div className="absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom,18px))] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <p className="max-w-xl text-center bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-4 py-2 shadow-xl font-serif font-bold text-sm sm:text-lg">{texto}</p>
        <div className="w-full max-w-md grid grid-cols-3 gap-2">
          {ZONAS.map((zona, i) => (
            <div key={zona.node} className="flex flex-col items-center gap-0.5">
              <div className="w-full h-3.5 sm:h-4 rounded-full border-2 border-[#3e2723] bg-lime-900/90 overflow-hidden shadow-lg" role="progressbar" aria-label={`Moho de ${NOMBRES[i].toLowerCase()}`}>
                <div
                  ref={(element) => {
                    bars.current[i] = element;
                  }}
                  className="h-full bg-[#e8dcc0]"
                  style={{ width: '0%' }}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow">{NOMBRES[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
