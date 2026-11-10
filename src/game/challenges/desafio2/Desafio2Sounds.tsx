import { usePlayerStore } from '@/game/player/playerStore';
import { useCombat } from '@/game/sound/combatStore';
import { useLoopNear } from '@/game/engine/audio/useLoopNear';
import { useSfxNow } from '@/game/sound/useSfxNow';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { useBosqueStore } from './bosqueStore';
import { HADA_PEDESTAL } from './claroDelHada/lugares';
import { getItemState } from './mission';

const PEDESTAL = { x: HADA_PEDESTAL[0], y: HADA_PEDESTAL[1] + 1, z: HADA_PEDESTAL[2] };
const trapped = () => (useProgressStore.getState().progress.hadaLiberada ? null : PEDESTAL);
const free = () => (useProgressStore.getState().progress.hadaLiberada ? PEDESTAL : null);

// The goblin closest to the player among those still alive, while the player is in the forest (where they hunt).
const nearestDuende = () => {
  if (useZoneStore.getState().region !== 'bosque') return null;
  const player = usePlayerStore.getState().position;
  let nearest = null;
  let best = Infinity;
  for (const duende of useBosqueStore.getState().duendes) {
    if (!duende.active) continue;
    const distance = duende.position.distanceToSquared(player);
    if (distance < best) [best, nearest] = [distance, duende.position];
  }
  return nearest;
};

// The elven blade hums when goblins are near, as long as the player carries it.
const bladeWarning = () => (getItemState('espada', useProgressStore.getState().progress) === 'owned' ? nearestDuende() : null);

const DUENDE_FIGHT_RANGE = 12;
const duendeFight = () => {
  const duende = nearestDuende();
  return duende !== null && duende.distanceTo(usePlayerStore.getState().position) < DUENDE_FIGHT_RANGE;
};

// Sounds of the Dark Forest heard from a distance: the fairy's little light twinkling behind the brambles and, once
// she is free, her wings; the goblins giggling as they stalk the player and the sword humming its warning. Goblins
// close by bring the combat theme.
export function Desafio2Sounds() {
  useLoopNear('d2_lucecita', trapped, 30, 0.7);
  useLoopNear('d2_hada_alas', free, 9, 0.45);
  useLoopNear('d2_espada_brillo', bladeWarning, 14, 0.45);
  useSfxNow('d2_duende_risa', nearestDuende, 22, [4, 9], 0.8);
  useCombat('duendes', duendeFight);
  return null;
}
