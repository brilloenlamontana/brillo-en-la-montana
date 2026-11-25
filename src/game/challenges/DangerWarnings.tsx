import { useEffect } from 'react';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import type { Region } from '@/game/world/regions';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore, type GameProgress } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';
import { CHALLENGES, currentObjective } from './registry';

// The same warning is not said again before this long (s): walking along the edge of a place crosses it many times.
const REPEAT_AFTER = 40;

// What to tell a player who walks from one region into another, if anything (see `danger` in each challenge):
// - out of the dangerous place of the challenge being played, with it unfinished: that it is not passed yet (nothing
//   on the way in: going in unprepared is the player's own choice, and so is finding out what is missing);
// - into the dangerous place of a later challenge: that it is not time yet, and what to do first.
function warningFor(from: Region, to: Region, progress: GameProgress): string | null {
  const current = CHALLENGES.findIndex((challenge) => !challenge.isCompleted?.(progress));
  if (current < 0) return null;
  const { danger } = CHALLENGES[current];
  if (danger?.region === from) return danger.pending(progress);
  if (CHALLENGES.some((challenge, index) => index > current && challenge.danger?.region === to)) {
    const first = currentObjective(progress)?.text;
    return `Todavía no es momento de entrar aquí.${first ? ` Primero: ${first}` : ''}`;
  }
  return null;
}

// Tells the player, on the way out of the swamp, the forest and the tunnels, that the challenge is still not done.
// Only listens to changes of region.
export function DangerWarnings() {
  useEffect(() => {
    let previous = useZoneStore.getState().region;
    let last = { message: '', at: 0 };
    return useZoneStore.subscribe(({ region }) => {
      if (region === previous) return;
      const from = previous;
      previous = region;
      // While loading, Warmup sets the region itself to prepare it: that is not the player walking.
      const world = useWorldStore.getState();
      if (world.warming || !world.ready) return;
      // A narration or a cinematic is talking: it moves the player on its own (a "bajo" sends them back to the start).
      const ui = useUIStore.getState();
      if (ui.dialog !== null || ui.cinematic) return;
      const message = warningFor(from, region, useProgressStore.getState().progress);
      const now = performance.now() / 1000;
      if (!message || (message === last.message && now - last.at < REPEAT_AFTER)) return;
      last = { message, at: now };
      useToastStore.getState().showToast(message);
    });
  }, []);
  return null;
}
