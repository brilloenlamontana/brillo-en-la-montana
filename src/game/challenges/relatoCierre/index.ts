import type { Challenge } from '@/game/challenges/types';
import { RelatoCierreWorld } from './RelatoCierreWorld';

// Closing story — the summit and the sanctuary with the chalice. Only its world is rendered so far.
export const relatoCierre: Challenge = {
  id: 'relatoCierre',
  title: 'Cumbre de la Desolación',
  World: RelatoCierreWorld,
  regions: ['cumbre'],
  // Where the tunnels come out on the summit.
  startPoint: { x: 104.08, y: 113.6, z: -168.29 },
  resumeAt: () => ({ x: 104.08, y: 113.6, z: -168.29, yaw: 0 }),
};
