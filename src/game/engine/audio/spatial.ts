import { usePlayerStore } from '@/game/player/playerStore';
import { playSfx } from './audio';
import type { SfxId } from './catalog';

type Point = { x: number; y: number; z: number };

// How loud something `radius` meters of reach sounds from where the player is: 1 beside it, 0 out of earshot, falling
// off quickly at first like a real source (the same curve as the loops of useLoopNear).
export function loudnessAt(at: Point, radius: number) {
  const player = usePlayerStore.getState().position;
  const distance = Math.hypot(at.x - player.x, at.y - player.y, at.z - player.z);
  return distance >= radius ? 0 : (1 - distance / radius) ** 2;
}

// A one-shot effect that happens at a place of the world: quieter the farther the player is, silent out of earshot.
export function playSfxAt(id: SfxId, at: Point, radius: number, volume = 1) {
  const level = volume * loudnessAt(at, radius);
  if (level > 0.01) playSfx(id, { volume: level });
}

// Footsteps of a creature that walks by code (no foot contacts to read): call the returned function every frame with
// the meters it just moved and where it is, and a step sounds every `stride` meters.
export function createFootsteps(id: SfxId, stride: number, radius: number, volume = 1) {
  let walked = stride / 2;
  return (meters: number, at: Point) => {
    walked += meters;
    if (walked < stride) return;
    walked = 0;
    playSfxAt(id, at, radius, volume);
  };
}
