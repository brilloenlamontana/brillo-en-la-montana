import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '@/game/player/playerStore';
import { isGameplayPaused } from '@/store/uiStore';
import { InteractionPrompt } from './InteractionPrompt';
import { PROMPT_Z_RANGE } from './promptLayer';
import { useInteractKey } from './useInteractKey';

type InteractionSpotProps = {
  // Where the thing to interact with is (world coordinates); the prompt floats `promptHeight` above it.
  position: readonly [number, number, number];
  // Horizontal reach (m).
  radius: number;
  // The player's feet may be this far below or above `position` (m).
  heightRange?: readonly [number, number];
  promptHeight?: number;
  // Whether it can be used right now (e.g. its part of the world is drawn and its step is pending).
  enabled: boolean;
  // Completes "Presiona E para…".
  prompt: string;
  onInteract: () => void;
};

// A fixed place the player interacts with (a statue, an altar, a bramble): while they stand within reach it shows the
// prompt and answers E, a tap or a click. Checked every frame, re-rendered only when the player comes or goes.
export function InteractionSpot({ position, radius, heightRange = [-2, 1.5], promptHeight = 1, enabled, prompt, onInteract }: InteractionSpotProps) {
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);

  useFrame(() => {
    let next = false;
    if (enabled && !isGameplayPaused()) {
      const player = usePlayerStore.getState();
      const dy = player.position.y - position[1];
      next =
        player.health > 0 &&
        dy > heightRange[0] &&
        dy < heightRange[1] &&
        Math.hypot(player.position.x - position[0], player.position.z - position[2]) < (nearRef.current ? radius + 0.3 : radius);
    }
    if (next !== nearRef.current) {
      nearRef.current = next;
      setNear(next);
    }
  });

  useInteractKey(near, onInteract);

  if (!near) return null;
  return (
    <Html zIndexRange={PROMPT_Z_RANGE} position={[position[0], position[1] + promptHeight, position[2]]} center>
      <InteractionPrompt action={prompt} onActivate={onInteract} />
    </Html>
  );
}
