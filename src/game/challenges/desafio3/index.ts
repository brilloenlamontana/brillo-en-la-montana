import type { Challenge } from '@/game/challenges/types';
import { DESAFIO3_BACKPACK } from './backpack';
import { Desafio3World } from './Desafio3World';

// Challenge 3 — Summit of Desolation tunnels. So far: its world, the arrival at Hedrig's mining town (which switches
// the backpack to her items: glove, compass and doll) and the goal. Hedrig, the Ogre and the spectre come next.
export const desafio3: Challenge = {
  id: 'desafio3',
  title: 'Túneles de la Cumbre',
  World: Desafio3World,
  backpack: DESAFIO3_BACKPACK,
  regions: ['pueblo', 'tuneles'],
  // In front of Hedrig's house, by the mine mouth where the tunnels start (ground at 23.9).
  startPoint: { x: 97, y: 25.4, z: -196 },
  // In front of the dwarf Hedrig's house: its door faces west, so the avatar faces east toward it (ground at 23.6).
  resumeAt: () => ({ x: 82, y: 25.3, z: -211.6, yaw: Math.PI / 2 }),
};
