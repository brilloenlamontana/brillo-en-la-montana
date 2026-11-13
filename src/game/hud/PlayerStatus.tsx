import { usePlayerStore } from '@/game/player/playerStore';
import { STARS, useProgressStore } from '@/store/progressStore';

// The palette of the game (parchment, wood, gold) and, for health, earthy tones that read at a glance: moss green
// while it is fine, ochre from half down and a deep clay red when it is about to run out.
const HEALTH_TONES = [
  { upTo: 25, fill: 'linear-gradient(180deg, #c0503a 0%, #8e2f1f 100%)', label: 'crítica' },
  { upTo: 50, fill: 'linear-gradient(180deg, #d9a55a 0%, #a8742a 100%)', label: 'baja' },
  { upTo: 100, fill: 'linear-gradient(180deg, #8fae4c 0%, #5b7a2a 100%)', label: 'buena' },
] as const;

// A bonus reward already won (gold ring, fairy's amulet).
function Bonus({ label, children }: { label: string; children: string }) {
  return (
    <span role="img" aria-label={label} title={label} className="text-sm sm:text-base leading-none">
      {children}
    </span>
  );
}

// `extra`: a star won with a bonus (moss green), on top of the three.
function Star({ lit, extra = false }: { lit: boolean; extra?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${lit ? 'scale-100' : 'scale-90 opacity-70'}`} aria-hidden="true">
      <path
        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"
        fill={lit ? (extra ? '#8fae4c' : '#f4d03f') : 'none'}
        stroke={lit ? (extra ? '#4f6b22' : '#b7791f') : '#a1887f'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Heart({ low }: { low: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${low ? 'animate-pulse' : ''}`} aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.7 4.8 7 4.8c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.3 0 5.4 3.1 4.2 6.4-1.7 4.7-9.2 9.3-9.2 9.3z"
        fill={low ? '#a93226' : '#7a4a2a'}
        stroke="#3e2723"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Top left: health, the stars left and the bonuses won, on a parchment strip like the rest of the game's panels.
// Subscribes only to those values, so walking around never re-renders it.
export function PlayerStatus() {
  const health = usePlayerStore((state) => state.health);
  const maxHealth = usePlayerStore((state) => state.maxHealth);
  const estrellas = useProgressStore((state) => state.progress.estrellas);
  const vidasExtra = useProgressStore((state) => state.progress.vidasExtra);
  const bono1 = useProgressStore((state) => state.progress.bono1Completado);
  const bono2 = useProgressStore((state) => state.progress.bono2Completado);
  const percent = Math.max(0, Math.min(100, (health / maxHealth) * 100));
  const tone = HEALTH_TONES.find((each) => percent <= each.upTo) ?? HEALTH_TONES[HEALTH_TONES.length - 1];
  const low = percent <= 25;
  const value = Math.ceil(health);

  return (
    <div className="absolute top-[max(12px,env(safe-area-inset-top,12px))] left-[max(12px,env(safe-area-inset-left,12px))] z-2 flex flex-col pointer-events-none select-none">
      <div className="flex items-center gap-2 sm:gap-3 bg-[#f4e4bc]/95 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border-2 border-[#5c3a21] shadow-[0_4px_12px_rgba(62,39,35,0.35)]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Heart low={low} />
          <div
            role="progressbar"
            aria-label={`Vida ${tone.label}`}
            aria-valuemin={0}
            aria-valuemax={maxHealth}
            aria-valuenow={value}
            className="relative w-[96px] sm:w-[168px] h-3.5 sm:h-[18px] rounded-full bg-[#3e2723]/85 border-2 border-[#3e2723] shadow-[inset_0_2px_3px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="h-full rounded-full transition-[width] duration-300 ease-out" style={{ width: `${percent}%`, background: tone.fill }}>
              {/* A soft shine along the top, like a filled glass vial. */}
              <div className="h-[40%] mx-1 mt-px rounded-full bg-white/25" />
            </div>
          </div>
          <span className={`font-bold tabular-nums text-xs sm:text-base min-w-[26px] sm:min-w-[32px] text-right ${low ? 'text-[#a93226]' : 'text-[#3e2723]'}`}>{value}</span>
        </div>
        <div
          className="flex items-center pl-2 sm:pl-3 border-l border-[#5c3a21]/30"
          role="img"
          aria-label={`${estrellas} de ${STARS} estrellas${vidasExtra ? ` y ${vidasExtra} extra` : ''}`}
        >
          {Array.from({ length: STARS }, (_, i) => (
            <Star key={i} lit={i < estrellas} />
          ))}
          {Array.from({ length: vidasExtra }, (_, i) => (
            <Star key={`extra-${i}`} lit extra />
          ))}
        </div>
        {(bono1 || bono2) && (
          <div className="flex items-center gap-1 pl-2 border-l border-[#5c3a21]/30">
            {bono1 && <Bonus label="Bono 1: anillo de oro">💍</Bonus>}
            {bono2 && <Bonus label="Bono 2: amuleto del hada">🧚</Bonus>}
          </div>
        )}
      </div>
    </div>
  );
}
