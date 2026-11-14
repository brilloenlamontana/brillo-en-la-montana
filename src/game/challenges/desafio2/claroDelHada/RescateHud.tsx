import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { rescateVivo, tajar, TALLOS, terminarRescate, useClaroStore, type Rescate } from './rescate';

// Keys that swing the sword like a click.
const SWING_KEYS = new Set([' ', 'Enter', 'e', 'E']);
// The ring that closes on the knot: how much wider than the knot's mark it is per second still to go, at most.
const ARO = { porSegundo: 1.5, max: 2.4 };

const texto = (fase: Rescate['fase'], mobile: boolean) => {
  if (fase === 'camino') return 'Te acercas al nudo de la zarza con la espada élfica en la mano…';
  if (fase === 'acecho' || fase === 'tajo') return mobile ? 'Toca la pantalla justo cuando el nudo brille para dar el tajo' : 'Haz clic (o la tecla E) justo cuando el nudo brille para dar el tajo';
  if (fase === 'aprieta') return '¡A destiempo! Las zarzas se aprietan. Espera a que el nudo brille';
  if (fase === 'seca') return '¡Buen tajo! La zarza se retuerce y se seca';
  return '¡La trampa se abre!';
};

// Cutting the brambles, over the canvas: it covers the whole screen, so the camera cannot be turned, and every click,
// tap or key on it swings the sword. A ring closes on the knot as the pulse of sap comes down to it, and three marks
// count the stalks cut. No backdrop blur over the canvas.
export function RescateHud() {
  const fase = useClaroStore((state) => state.rescate?.fase ?? null);
  const mobile = useIsMobile();
  const aro = useRef<HTMLDivElement>(null);
  const marca = useRef<HTMLDivElement>(null);
  const acechando = fase === 'acecho';

  // The ring follows the knot and the pulse every frame without re-rendering.
  useEffect(() => {
    if (fase === null) return;
    let frame = 0;
    const tick = () => {
      const { pantalla, falta, brillo } = rescateVivo;
      if (marca.current && aro.current) {
        marca.current.style.opacity = pantalla.visible ? '1' : '0';
        marca.current.style.left = `${pantalla.x * 100}%`;
        marca.current.style.top = `${pantalla.y * 100}%`;
        const lit = brillo >= 1;
        aro.current.style.transform = `scale(${1 + Math.min(ARO.max, Math.max(0, falta) * ARO.porSegundo)})`;
        aro.current.style.borderColor = lit ? '#fde68a' : 'rgba(255,255,255,0.75)';
        aro.current.style.borderWidth = lit ? '5px' : '3px';
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [fase]);

  useEffect(() => {
    if (!acechando) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return terminarRescate();
      if (event.repeat || !SWING_KEYS.has(event.key)) return;
      event.preventDefault();
      tajar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [acechando]);

  if (fase === null) return null;
  // Stalks cut so far (the store changes at every step, so this is up to date whenever it matters).
  const cortados = rescateVivo.cortados;

  return (
    <div className="absolute inset-0 z-30 select-none touch-none cursor-pointer" onPointerDown={tajar} role="button" aria-label="Dar un tajo con la espada élfica">
      <div ref={marca} className="absolute w-14 h-14 -translate-x-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-200" style={{ opacity: 0 }}>
        <div className="absolute inset-0 rounded-full border-2 border-[#fde68a]/90 shadow-[0_0_12px_rgba(253,230,138,0.7)]" />
        <div ref={aro} className="absolute inset-0 rounded-full border-solid" style={{ borderWidth: '3px', borderColor: 'rgba(255,255,255,0.75)' }} />
      </div>
      {acechando && (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={terminarRescate}
          className="absolute top-[max(64px,calc(env(safe-area-inset-top,12px)+52px))] right-[max(12px,env(safe-area-inset-right,12px))] bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-serif font-bold shadow-lg cursor-pointer hover:bg-[#ead7a4]"
        >
          Dejarlo para después
        </button>
      )}
      <div className="absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom,18px))] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        <p className="max-w-xl text-center bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-4 py-2 shadow-xl font-serif font-bold text-sm sm:text-lg">{texto(fase, mobile)}</p>
        <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-white drop-shadow" role="img" aria-label={`Zarzas cortadas: ${cortados} de ${TALLOS.length}`}>
          <span>Zarzas</span>
          {TALLOS.map((tallo, i) => (
            <span key={tallo.nudo} className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-[#3e2723] shadow ${i < cortados ? 'bg-[#bef264]' : 'bg-stone-800/90'}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
