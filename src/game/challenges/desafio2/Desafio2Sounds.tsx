import { useLoopNear } from '@/game/sound/useLoopNear';
import { useProgressStore } from '@/store/progressStore';
import { HADA_PEDESTAL } from './claroDelHada/lugares';

const PEDESTAL = { x: HADA_PEDESTAL[0], y: HADA_PEDESTAL[1] + 1, z: HADA_PEDESTAL[2] };
const trapped = () => (useProgressStore.getState().progress.hadaLiberada ? null : PEDESTAL);
const free = () => (useProgressStore.getState().progress.hadaLiberada ? PEDESTAL : null);

// The fairy's clearing heard from the path: her little light twinkling behind the brambles and, once she is free, her
// wings as she flutters around.
export function Desafio2Sounds() {
  useLoopNear('d2_lucecita', trapped, 30, 0.7);
  useLoopNear('d2_hada_alas', free, 9, 0.45);
  return null;
}
