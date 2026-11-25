import { useEffect, useState } from 'react';
import { currentObjective } from '@/game/challenges/registry';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';

// The objective stays on screen this long (s) each time it shows.
const SECONDS = 5;

// What the story asks of the player right now, in one line (each challenge writes it: see `objective` in
// challenges/types.ts): where to go, never what is left to do there. The beacon of light in the world
// (ObjectiveBeacon) marks the same place. It comes in at the top centre, under the bars, stays 5 seconds and goes; it
// comes back whenever it changes and whenever the player asks for it with the button of the top bar
// (ObjectiveButton). The same with a keyboard and on a touch screen. It waits while a narration, a cinematic, the
// backpack, the tutorial or a notice has the screen.
export function ObjectiveLine() {
  const ready = useWorldStore((state) => state.ready);
  const busy = useUIStore((state) => state.dialog !== null || state.cinematic || state.backpackOpen || state.tutorialOpen);
  const asked = useUIStore((state) => state.objectiveRun);
  const region = useZoneStore((state) => state.region);
  const text = useProgressStore((state) => currentObjective(state.progress, region)?.text ?? null);
  // A notice (Toast) uses the same place at the top: the objective waits behind it.
  const noticed = useToastStore((state) => state.message !== null && state.message !== '');
  // Which showing is still on screen: the objective and the time it was asked for.
  const showing = `${text}|${asked}`;
  const [gone, setGone] = useState<string | null>(null);

  // Counted only while it can be seen: a dialog or a notice over it does not use up its time.
  const hidden = !ready || busy || !text || noticed;
  useEffect(() => {
    if (hidden) return;
    const timer = setTimeout(() => setGone(showing), SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [hidden, showing]);

  if (hidden || gone === showing) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute left-1/2 -translate-x-1/2 top-[max(68px,calc(env(safe-area-inset-top,0px)+68px))] sm:top-[max(84px,calc(env(safe-area-inset-top,0px)+84px))] z-30 w-max min-w-[12rem] max-w-[min(30rem,calc(100vw-2rem))] flex items-start gap-2 bg-[#f4e4bc]/95 border-2 border-[#5c3a21] rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_4px_12px_rgba(62,39,35,0.35)] pointer-events-none select-none"
    >
      {/* The same gold as the beacon and as the next place on the minimap. */}
      <span className="relative mt-[3px] sm:mt-1 flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-[#f4d03f]/70 animate-ping" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-[#f4d03f] ring-1 ring-[#5c3a21]" />
      </span>
      {/* The key makes each showing come in with a short fade, so it is noticed. */}
      <p key={showing} className="objective-in font-serif text-[11px] sm:text-sm leading-snug text-[#3e2723]">
        <span className="font-bold">Objetivo: </span>
        {text}
      </p>
    </div>
  );
}

// The button of the top bar that shows the objective again for a moment.
export function ObjectiveButton() {
  const label = 'Ver mi objetivo';
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.currentTarget.blur();
          useUIStore.getState().showObjective();
        }}
        title={label}
        aria-label={label}
        className="flex items-center justify-center w-8 h-8 rounded-full text-madera-700 hover:scale-110 active:scale-95 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-madera-600"
      >
        {/* A target: where to aim next. */}
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.3" fill="currentColor" />
        </svg>
      </button>
      <div className="w-px h-5 bg-papel-300" />
    </>
  );
}
