import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { encendidoVivo, golpearPedernal, terminarEncendido } from './encendido';
import { useChozaStore } from './limpieza';

// Keys that strike like a click.
const STRIKE_KEYS = new Set([' ', 'Enter', 'e', 'E']);

// Lighting the fire in the stone plate, over the canvas: it covers the whole screen, so the camera cannot be turned,
// and every click, tap or key on it strikes the fire stones. A bar shows the ember catching. No backdrop blur over the
// canvas.
export function EncendidoHud() {
  const fase = useChozaStore((state) => state.encendido?.fase ?? null);
  const mobile = useIsMobile();
  const bar = useRef<HTMLDivElement>(null);
  const golpeando = fase === 'chispa';

  // The bar follows the ember every frame without re-rendering.
  useEffect(() => {
    if (fase === null) return;
    let frame = 0;
    const tick = () => {
      if (bar.current) bar.current.style.width = `${Math.round(encendidoVivo.brasa * 1000) / 10}%`;
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [fase]);

  useEffect(() => {
    if (!golpeando) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return terminarEncendido();
      if (event.repeat || !STRIKE_KEYS.has(event.key)) return;
      event.preventDefault();
      golpearPedernal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [golpeando]);

  if (fase === null) return null;

  const texto =
    fase === 'camino' || fase === 'agacha'
      ? 'Te arrodillas junto al plato con las dos piedras de chispa…'
      : fase === 'chispa'
        ? mobile
          ? 'Toca la pantalla varias veces seguidas para golpear las piedras y sacar chispas'
          : 'Haz clic varias veces seguidas (o la tecla E) para golpear las piedras y sacar chispas'
        : '¡El fuego prendió!';

  return (
    <div className="absolute inset-0 z-30 select-none touch-none cursor-pointer" onPointerDown={golpearPedernal} role="button" aria-label="Golpear una piedra de chispa contra la otra">
      {golpeando && (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={terminarEncendido}
          className="absolute top-[max(64px,calc(env(safe-area-inset-top,12px)+52px))] right-[max(12px,env(safe-area-inset-right,12px))] bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-serif font-bold shadow-lg cursor-pointer hover:bg-[#ead7a4]"
        >
          Dejarlo para después
        </button>
      )}
      <div className="absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom,18px))] flex flex-col items-center gap-2 px-4 pointer-events-none">
        <p className="max-w-xl text-center bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-4 py-2 shadow-xl font-serif font-bold text-sm sm:text-lg">{texto}</p>
        <div className="w-full max-w-md flex items-center gap-2 text-[11px] sm:text-xs font-bold text-white drop-shadow">
          <span>Chispa</span>
          <div className="flex-1 h-4 sm:h-5 rounded-full border-2 border-[#3e2723] bg-stone-800/90 overflow-hidden shadow-lg" role="progressbar" aria-label="Brasa">
            <div ref={bar} className="h-full bg-gradient-to-r from-[#b45309] via-[#f59e0b] to-[#fde68a]" style={{ width: '0%' }} />
          </div>
          <span>Fuego</span>
        </div>
      </div>
    </div>
  );
}
