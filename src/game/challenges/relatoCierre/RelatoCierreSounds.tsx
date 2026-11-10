import { useLoopNear } from '@/game/engine/audio/useLoopNear';

// The altar of the sanctuary, where the chalice glows (see santuario/Santuario: ALTAR).
const ALTAR = { x: 163.2, y: 54, z: -153 };
const altar = () => ALTAR;

// The green glow of the chalice, heard from the sanctuary square.
export function RelatoCierreSounds() {
  useLoopNear('rc_haz_verde', altar, 30, 0.7);
  return null;
}
