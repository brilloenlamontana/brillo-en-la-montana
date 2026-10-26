import { MAX_HAMBRE, useBosqueStore } from '../bosqueStore';

function FruitIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden="true">
      <path d="M12 7c-2-1.6-6.5-1.4-7.4 2.6-.9 4 1.8 10.4 4.6 10.4 1.1 0 1.7-.6 2.8-.6s1.7.6 2.8.6c2.8 0 5.5-6.4 4.6-10.4C18.5 5.6 14 5.4 12 7z" fill="#c0392b" stroke="#7b241c" strokeWidth="1.2" />
      <path d="M12 7c0-2 .6-3.4 2-4.4" fill="none" stroke="#5c3a21" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// Under the health bar, only while the forest's hunger applies: how full the player still is. Subscribes to whole
// percentages, so it re-renders about once per second.
export function HambreBar() {
  const active = useBosqueStore((state) => state.hambreActiva);
  const percent = useBosqueStore((state) => Math.ceil((state.hambre / MAX_HAMBRE) * 100));
  if (!active) return null;
  const color = percent <= 15 ? 'bg-red-500' : percent <= 35 ? 'bg-orange-500' : 'bg-amber-400';

  return (
    <div
      className="absolute top-[calc(max(12px,env(safe-area-inset-top,12px))+44px)] sm:top-[calc(max(12px,env(safe-area-inset-top,12px))+54px)] left-[max(12px,env(safe-area-inset-left,12px))] z-2 pointer-events-none select-none"
      role="meter"
      aria-label="Hambre"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`flex items-center gap-2 bg-white/90 px-3 py-1 sm:px-4 sm:py-1.5 rounded-xl border border-slate-200/90 shadow-md ${percent === 0 ? 'animate-pulse' : ''}`}>
        <FruitIcon />
        <span className="text-slate-700 font-bold text-[11px] sm:text-sm">Hambre</span>
        <div className="relative w-[70px] sm:w-[110px] h-2.5 sm:h-3 bg-black/50 rounded-xl overflow-hidden border-2 border-[#222]">
          <div className={`h-full transition-all duration-500 ease-linear ${color}`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
