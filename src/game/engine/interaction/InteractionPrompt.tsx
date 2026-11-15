import { useEffect, useRef, useState } from 'react';
import { playSfx } from '@/game/engine/audio/audio';
import { useIsMobile } from '@/hooks/useIsMobile';
import { newOfferId, useInteractionStore } from './interactionStore';

// The tick that tells there is something to do here; prompts that flicker in and out do not repeat it.
const TICK_AGAIN_MS = 700;
let lastTick = -Infinity;
function tick() {
  const now = performance.now();
  if (now - lastTick < TICK_AGAIN_MS) return;
  lastTick = now;
  playSfx('ui_prompt', { volume: 0.5 });
}

// The label that floats over something the player can use. With a keyboard it names the E key; on a touch screen it
// can be tapped, and the same action is offered as a big button next to the run and jump buttons (interactionStore),
// since a small label in the middle of the world is hard to hit with a thumb.
export function InteractionPrompt({ action, onActivate }: { action: string; onActivate: () => void }) {
  const isMobile = useIsMobile();
  useEffect(tick, []);

  // The newest handler is the one called, without re-announcing the prompt every render.
  const handler = useRef(onActivate);
  useEffect(() => {
    handler.current = onActivate;
  }, [onActivate]);
  const [id] = useState(newOfferId);
  useEffect(() => {
    const { offer, withdraw } = useInteractionStore.getState();
    offer({ id, action, activate: () => handler.current() });
    return () => withdraw(id);
  }, [id, action]);

  if (isMobile) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className="bg-[#3e2723]/85 text-[#f4e4bc] px-3.5 py-1.5 rounded-xl whitespace-nowrap select-none border border-[#f4d03f]/60 text-xs font-semibold shadow-xl cursor-pointer active:scale-95 transition-transform"
      >
        Toca para <b>{action}</b>
      </button>
    );
  }

  return (
    <div className="bg-black/80 text-white px-3 py-1.5 rounded-lg whitespace-nowrap select-none border border-white/10 text-xs sm:text-sm font-medium shadow-lg pointer-events-none">
      Presiona <b>E</b> para {action}
    </div>
  );
}
