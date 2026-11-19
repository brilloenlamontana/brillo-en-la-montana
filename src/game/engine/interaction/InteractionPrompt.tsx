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

// The label that floats over something the player can use. With a keyboard it names the E key. On a touch screen no
// label is drawn in the world (it would sit over the avatar): the same action is offered as a button under the thumb
// (interactionStore, MobileControls), and tapping the thing itself also works.
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

  if (isMobile) return null;

  return (
    <div className="bg-black/80 text-white px-3 py-1.5 rounded-lg whitespace-nowrap select-none border border-white/10 text-xs sm:text-sm font-medium shadow-lg pointer-events-none">
      Presiona <b>E</b> para {action}
    </div>
  );
}
