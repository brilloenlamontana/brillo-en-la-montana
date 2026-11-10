import { useProgressStore } from '@/store/progressStore';
import { getItemState } from './mission';
import { useTunelStore } from './tunelStore';

// The spectre's cold: a pale blue frost closes in from the edges of the screen as she gets near, and flashes when she
// touches the player.
function FrioDelEspectro() {
  const frio = useTunelStore((state) => state.frio);
  const toqueAt = useTunelStore((state) => state.toqueAt);
  if (frio === 0) return null;
  return (
    <div className="absolute inset-0 z-1 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 42%, rgba(150, 205, 255, ${0.6 * frio}) 100%)` }} />
      {toqueAt !== null && <div key={toqueAt} className="absolute inset-0 bg-sky-200 animate-espectro-toque" />}
    </div>
  );
}

// Reminder that the compass is out (its trail only shows inside the tunnels).
function BrujulaActiva() {
  const activa = useTunelStore((state) => state.brujulaActiva);
  const owned = useProgressStore((state) => getItemState('brujula', state.progress) === 'owned');
  if (!activa || !owned) return null;
  return (
    <div className="absolute top-[max(58px,calc(env(safe-area-inset-top,12px)+46px))] left-[max(12px,env(safe-area-inset-left,12px))] z-2 pointer-events-none select-none bg-slate-900/85 text-sky-200 border border-sky-300/50 rounded-xl px-3 py-1 text-xs sm:text-sm font-semibold shadow-md">
      Brújula activa · sigue la luz azul
    </div>
  );
}

// HUD of Challenge 3 (each piece renders only while it applies).
export function Desafio3Hud() {
  return (
    <>
      <FrioDelEspectro />
      <BrujulaActiva />
    </>
  );
}
