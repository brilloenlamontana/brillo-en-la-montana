import { usePlayerStore } from '@/game/player/playerStore';
import { useLoopNear } from '@/game/sound/useLoopNear';
import { useProgressStore } from '@/store/progressStore';
import { usePantanoStore } from './pantanoStore';

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

// Sounds of the swamp enemies heard from a distance: the buzz of the zumbadores and the hum of the golem's blue core.
export function Desafio1Sounds() {
  useLoopNear('d1_zumbon_vuelo', nearestZumbador, 16, 0.9);
  useLoopNear('d1_golem_nucleo', golemCore, 20, 0.8);
  return null;
}
