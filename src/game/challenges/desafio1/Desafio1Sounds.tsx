import { usePlayerStore } from '@/game/player/playerStore';
import { useCombat } from '@/game/sound/combatStore';
import { useLoopNear } from '@/game/engine/audio/useLoopNear';
import { useProgressStore } from '@/store/progressStore';
import { usePantanoStore } from './pantanoStore';
import { nearestWellRim } from './pantanoTristeza/wells';

// The nearest zumbador that is out and alive.
const nearestZumbador = () => {
  const player = usePlayerStore.getState().position;
  const defeated = useProgressStore.getState().progress.zumbadoresDefeated;
  let nearest = null;
  let best = Infinity;
  usePantanoStore.getState().zumbadores.forEach((zumbador, index) => {
    if (!zumbador.active || defeated.includes(index)) return;
    const distance = zumbador.position.distanceToSquared(player);
    if (distance < best) {
      best = distance;
      nearest = zumbador.position;
    }
  });
  return nearest;
};

const golemCore = () => {
  const { golem } = usePantanoStore.getState();
  return golem.active && !useProgressStore.getState().progress.golemDefeated ? golem.position : null;
};

// The mud bubbling in the well closest to the player.
const nearestWell = () => {
  const { x, z } = usePlayerStore.getState().position;
  return nearestWellRim(x, z);
};

// The stone well of the villa's square (see villaDeBoj/villaColliders: 'pozo-plaza').
const POZO_PLAZA = { x: -79.93, y: 12.6, z: 19.1 };
const pozoPlaza = () => POZO_PLAZA;

// The golem is out and close enough to be a threat.
const GOLEM_FIGHT_RANGE = 30;
const golemFight = () => {
  const core = golemCore();
  return core !== null && core.distanceTo(usePlayerStore.getState().position) < GOLEM_FIGHT_RANGE;
};

// Sounds of Challenge 1 heard from a distance: the buzz of the zumbadores, the hum of the golem's blue core, the mud
// bubbling in the swamp wells and the water dripping in the villa's well. The golem brings the combat theme.
export function Desafio1Sounds() {
  useLoopNear('d1_zumbon_vuelo', nearestZumbador, 16, 0.9);
  useLoopNear('d1_golem_nucleo', golemCore, 20, 0.8);
  useLoopNear('d1_burbujas', nearestWell, 10, 0.7);
  useLoopNear('obj_pozo_agua', pozoPlaza, 7, 0.6);
  useCombat('golem', golemFight);
  return null;
}
