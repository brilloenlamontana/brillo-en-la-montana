import { useLoopNear } from '@/game/sound/useLoopNear';
import { useProgressStore } from '@/store/progressStore';
import { useTunelStore } from './tunelStore';

// Hedrig's campfire, with her cauldron over it (see casaDeHedrig/hedrigColliders: 'hedrig-fogata').
const FOGATA = { x: 83.45, y: 24.4, z: -208.6 };
const fogata = () => FOGATA;

const espectro = () => {
  const { espectro: ghost } = useTunelStore.getState();
  return ghost.active && !useProgressStore.getState().progress.espectroCalmado ? ghost.position : null;
};

// Sounds of the mining town and the tunnels heard from a distance: the campfire and its cauldron, and the weeping of
// the ghost girl until she gets her doll back.
export function Desafio3Sounds() {
  useLoopNear('obj_fogata', fogata, 14, 0.9);
  useLoopNear('obj_caldero', fogata, 6, 0.5);
  useLoopNear('d3_espectro_llanto', espectro, 26, 0.9);
  return null;
}
