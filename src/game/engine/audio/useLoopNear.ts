import { useEffect } from 'react';
import { loopSfx, type Loop } from './audio';
import type { SfxId } from './catalog';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';

type Point = { x: number; y: number; z: number };
// Where the sound comes from right now, or null while there is nothing to hear (enemy asleep, fire out…). It must be
// a stable function (declared outside the component): it is read a few times per second, never per frame.
export type SoundSource = () => Point | null;

const CHECK_MS = 140;

// A looping sound placed in the world (a campfire, a buzzing insect, a weeping ghost): it fades in as the player
// comes within `radius` meters of its source and out as they leave. It only plays while it can be heard.
export function useLoopNear(id: SfxId, source: SoundSource, radius: number, volume = 1) {
  useEffect(() => {
    let loop: Loop | null = null;
    const interval = setInterval(() => {
      const at = useWorldStore.getState().ready ? source() : null;
      const player = usePlayerStore.getState().position;
      const distance = at ? Math.hypot(at.x - player.x, at.y - player.y, at.z - player.z) : Infinity;
      if (distance >= radius) {
        loop?.stop(0.5);
        loop = null;
        return;
      }
      // Louder the closer, falling off quickly at first like a real source.
      const level = volume * (1 - distance / radius) ** 2;
      if (loop) loop.setVolume(level, CHECK_MS / 1000);
      else loop = loopSfx(id, level);
    }, CHECK_MS);
    return () => {
      clearInterval(interval);
      loop?.stop(0.3);
    };
  }, [id, source, radius, volume]);
}
