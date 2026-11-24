import { currentObjective } from '@/game/challenges/registry';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { useProgressStore } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';

// Bottom centre: what the story asks of the player right now, in one line that never goes away on its own (each
// challenge writes it: see `objective` in challenges/types.ts). It changes by itself when a step is done, and the
// beacon of light in the world (ObjectiveBeacon) marks the same place. It steps aside while a narration, a cinematic
// or the backpack fills the screen. `touch`: the joystick and the action buttons take the bottom corners.
export function ObjectiveLine({ touch = false }: { touch?: boolean }) {
  const ready = useWorldStore((state) => state.ready);
  const busy = useUIStore((state) => state.dialog !== null || state.cinematic || state.backpackOpen);
  const text = useProgressStore((state) => currentObjective(state.progress)?.text ?? null);

  if (!ready || busy || !text) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`absolute bottom-[max(12px,env(safe-area-inset-bottom,12px))] left-1/2 -translate-x-1/2 z-2 w-max ${
        touch ? 'max-w-[calc(100vw-24rem)]' : 'max-w-[min(34rem,calc(100vw-26rem))]'
      } min-w-[12rem] flex items-start gap-2 bg-[#f4e4bc]/95 border-2 border-[#5c3a21] rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 shadow-[0_4px_12px_rgba(62,39,35,0.35)] pointer-events-none select-none`}
    >
      {/* The same gold as the beacon and as the next place on the minimap. */}
      <span className="relative mt-[3px] sm:mt-1 flex h-2.5 w-2.5 shrink-0" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-[#f4d03f]/70 animate-ping" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-[#f4d03f] ring-1 ring-[#5c3a21]" />
      </span>
      {/* The key makes a new objective come in with a short fade, so the change is noticed. */}
      <p key={text} className="objective-in font-serif text-[11px] sm:text-sm leading-snug text-[#3e2723]">
        <span className="font-bold">Objetivo: </span>
        {text}
      </p>
    </div>
  );
}
