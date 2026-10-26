import type { Challenge } from '@/game/challenges/types';
import { Desafio3World } from './Desafio3World';

// Challenge 3 — Summit of Desolation tunnels. Only its world is rendered so far.
export const desafio3: Challenge = {
  id: 'desafio3',
  title: 'Túneles de la Cumbre',
  World: Desafio3World,
  regions: ['pueblo', 'tuneles'],
  // In front of Hedrig's house, by the mine mouth where the tunnels start (ground at 23.9).
  startPoint: { x: 97, y: 25.4, z: -196 },
  // In front of the dwarf Hedrig's house: its door faces west, so the avatar faces east toward it (ground at 23.6).
  resumeAt: () => ({ x: 82, y: 25.3, z: -211.6, yaw: Math.PI / 2 }),
};
