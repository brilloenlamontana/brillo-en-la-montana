import { usePlayerStore } from '@/game/player/playerStore';
import { STARS, useProgressStore } from '@/store/progressStore';

// A bonus reward already won (gold ring, fairy's amulet).
function Bonus({ label, children }: { label: string; children: string }) {
  return (
    <span role="img" aria-label={label} title={label} className="text-sm sm:text-base leading-none">
      {children}
    </span>
  );
}

// `extra`: a star won with a bonus (green), on top of the three.
function Star({ lit, extra = false }: { lit: boolean; extra?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${lit ? 'scale-100' : 'scale-90 opacity-60'}`} aria-hidden="true">
      <path
        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"
        fill={lit ? (extra ? '#34d399' : '#f4d03f') : 'none'}
        stroke={lit ? (extra ? '#047857' : '#b7791f') : '#94a3b8'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Top left: health, the stars left and the bonuses won. Subscribes only to those values, so walking around
// never re-renders it.
export function PlayerStatus() {
  const health = usePlayerStore((state) => state.health);
  const maxHealth = usePlayerStore((state) => state.maxHealth);
  const estrellas = useProgressStore((state) => state.progress.estrellas);
  const vidasExtra = useProgressStore((state) => state.progress.vidasExtra);
  const bono1 = useProgressStore((state) => state.progress.bono1Completado);
  const bono2 = useProgressStore((state) => state.progress.bono2Completado);
  const percent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const color = percent <= 25 ? 'bg-red-500' : percent <= 50 ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <div className="absolute top-[max(12px,env(safe-area-inset-top,12px))] left-[max(12px,env(safe-area-inset-left,12px))] z-2 flex flex-col pointer-events-none select-none">
      <div className="flex items-center gap-2 sm:gap-2.5 bg-white/90 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-md">
        <div className="relative w-[110px] sm:w-[180px] h-4 sm:h-5 bg-black/50 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-[#222]">
          <div className={`h-full transition-all duration-300 ease-in-out ${color}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="text-slate-800 font-bold text-xs sm:text-base min-w-[28px] sm:min-w-[36px] text-right">{Math.ceil(health)}</span>
        <div className="flex items-center" role="img" aria-label={`${estrellas} de ${STARS} estrellas${vidasExtra ? ` y ${vidasExtra} extra` : ''}`}>
          {Array.from({ length: STARS }, (_, i) => (
            <Star key={i} lit={i < estrellas} />
          ))}
          {Array.from({ length: vidasExtra }, (_, i) => (
            <Star key={`extra-${i}`} lit extra />
          ))}
        </div>
        {(bono1 || bono2) && (
          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-300">
            {bono1 && <Bonus label="Bono 1: anillo de oro">💍</Bonus>}
            {bono2 && <Bonus label="Bono 2: amuleto del hada">🧚</Bonus>}
          </div>
        )}
      </div>
    </div>
  );
}
