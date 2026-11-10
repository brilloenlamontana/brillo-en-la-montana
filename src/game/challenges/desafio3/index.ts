import type { Challenge } from '@/game/challenges/types';
import { DESAFIO3_BACKPACK } from './backpack';
import { Desafio3Dialogs } from './Desafio3Dialogs';
import { Desafio3Hud } from './Desafio3Hud';
import { Desafio3World } from './Desafio3World';
import { isDesafio3Completado } from './mission';

// Challenge 3 — Summit of Desolation tunnels. Hedrig the dwarf miner and her house (glove, compass and doll), the
// maze of tunnels where the compass shows the way, the spectre of the girl who wants her doll back, and the Ogre who
// only lets through whoever beats him at arm wrestling. Rules in mission.ts, items in items.ts and backpack.ts.
export const desafio3: Challenge = {
  id: 'desafio3',
  title: 'Túneles de la Cumbre',
  World: Desafio3World,
  Dialogs: Desafio3Dialogs,
  Hud: Desafio3Hud,
  backpack: DESAFIO3_BACKPACK,
  regions: ['pueblo', 'tuneles'],
  // In front of Hedrig's house, by the mine mouth where the tunnels start (ground at 23.9).
  startPoint: { x: 97, y: 25.4, z: -196 },
  // In front of the dwarf Hedrig's house: its door faces west, so the avatar faces east toward it (ground at 23.6).
  resumeAt: () => ({ x: 82, y: 25.3, z: -211.6, yaw: Math.PI / 2 }),
  isCompleted: isDesafio3Completado,
};
