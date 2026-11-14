import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { auxilioVivo, sostener, terminarAuxilio } from './auxilio';
import { useClaroStore, type Auxilio, type Entrega } from './claroStore';
import { terminarEntrega } from './entrega';

// Keys that hold her hand like a pressed button.
const HOLD_KEYS = new Set([' ', 'Enter', 'e', 'E']);

const auxilioTexto = (fase: Auxilio['fase'], mobile: boolean) => {
  if (fase === 'cae') return 'La jaula se abre, pero el hada no puede volar: tiene un ala arrugada y cae al suelo';
  if (fase === 'camino' || fase === 'arrodilla') return 'Te arrodillas junto a ella y le tiendes la mano…';
  if (fase === 'sostiene') return mobile ? 'Mantén el dedo en la pantalla para sostenerla mientras recupera fuerzas' : 'Mantén presionado el clic (o la tecla E) para sostenerla mientras recupera fuerzas';
  if (fase === 'lista') return '¡Sus alas brillan! Suelta para dejarla volar';
  if (fase === 'despega') return '¡El hada alza el vuelo!';
  return 'Hada: «Pudiste seguir de largo y te desviaste por alguien que no conocías. Espera: tengo algo para ti».';
};

const ENTREGA_TEXTO: Record<Entrega['fase'], string> = {
  camino: 'Te acercas al atril de raíces…',
  arrodilla: 'Pones una rodilla en tierra frente al hada…',
  acerca: 'El hada trae su amuleto volando despacio: le pesa',
  cuelga: 'Te cuelga el amuleto al cuello',
  celebra: 'Hada: «Allá arriba el frío y la tristeza son grandes. Que mi luz te recuerde que no caminas solo».',
  guarda: 'El amuleto del hada va contigo',
};

// The scenes of the fairy's rescue and of her amulet, over the canvas: it covers the whole screen, so the camera
// cannot be turned, and says what is happening. While the fairy gathers strength, pressing anywhere (or a key) holds
// her hand and letting go releases it; a bar shows her strength. No backdrop blur over the canvas.
export function ClaroHud() {
  const auxilio = useClaroStore((state) => state.auxilio?.fase ?? null);
  const entrega = useClaroStore((state) => state.entrega?.fase ?? null);
  const mobile = useIsMobile();
  const bar = useRef<HTMLDivElement>(null);
  const sosteniendo = auxilio === 'sostiene' || auxilio === 'lista';

  // The bar follows her strength every frame without re-rendering.
  useEffect(() => {
    if (!sosteniendo) return;
    let frame = 0;
    const tick = () => {
      if (bar.current) bar.current.style.width = `${Math.round(auxilioVivo.fuerza * 1000) / 10}%`;
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [sosteniendo]);

  useEffect(() => {
    if (!sosteniendo) return;
    const onDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return terminarAuxilio();
      if (!HOLD_KEYS.has(event.key)) return;
      event.preventDefault();
      if (!event.repeat) sostener(true);
    };
    const onUp = (event: KeyboardEvent) => {
      if (HOLD_KEYS.has(event.key)) sostener(false);
    };
    const release = () => sostener(false);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', release);
      release();
    };
  }, [sosteniendo]);

  if (auxilio === null && entrega === null) return null;
  const texto = auxilio !== null ? auxilioTexto(auxilio, mobile) : ENTREGA_TEXTO[entrega!];
  const dejar = auxilio !== null ? terminarAuxilio : terminarEntrega;
  // It can be left for later until she takes off (after that it is saved and only watched).
  const sePuedeDejar = auxilio === 'sostiene' || entrega === 'camino' || entrega === 'arrodilla';

  return (
    <div
      className={`absolute inset-0 z-30 select-none touch-none ${sosteniendo ? 'cursor-pointer' : ''}`}
      onPointerDown={() => sostener(true)}
      onPointerUp={() => sostener(false)}
      onPointerCancel={() => sostener(false)}
      onPointerLeave={() => sostener(false)}
      role={sosteniendo ? 'button' : undefined}
      aria-label={sosteniendo ? 'Sostener la mano del hada' : undefined}
    >
      {sePuedeDejar && (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={dejar}
          className="absolute top-[max(64px,calc(env(safe-area-inset-top,12px)+52px))] right-[max(12px,env(safe-area-inset-right,12px))] bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-3 py-1.5 text-xs sm:text-sm font-serif font-bold shadow-lg cursor-pointer hover:bg-[#ead7a4]"
        >
          Dejarlo para después
        </button>
      )}
      <div className="absolute inset-x-0 bottom-[max(18px,env(safe-area-inset-bottom,18px))] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        <p className="max-w-xl text-center bg-[#f4e4bc] text-[#3e2723] border-2 border-[#5c3a21] rounded-xl px-4 py-2 shadow-xl font-serif font-bold text-sm sm:text-lg">{texto}</p>
        {sosteniendo && (
          <div className="w-full max-w-md flex items-center gap-2 text-[11px] sm:text-xs font-bold text-white drop-shadow">
            <span>Débil</span>
            <div className="flex-1 h-4 sm:h-5 rounded-full border-2 border-[#3e2723] bg-stone-800/90 overflow-hidden shadow-lg" role="progressbar" aria-label="Fuerzas del hada">
              <div ref={bar} className="h-full bg-gradient-to-r from-[#0e7490] via-[#67e8f9] to-[#fef9c3]" style={{ width: '0%' }} />
            </div>
            <span>Lista</span>
          </div>
        )}
      </div>
    </div>
  );
}
