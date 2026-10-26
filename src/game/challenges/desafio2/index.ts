import type { Challenge } from '@/game/challenges/types';
import { DESAFIO2_BACKPACK } from './backpack';
import { Desafio2Dialogs } from './Desafio2Dialogs';
import { Desafio2Hud } from './Desafio2Hud';
import { Desafio2World } from './Desafio2World';
import { isDesafio2Completado } from './mission';

// Challenge 2 — Dark Forest. So far: the elf (after Challenge 1), his help, his house, his tools in the backpack, the
// wild goblins (defeated with the elven sword), the forest's hunger with its fruit (only the lens tells the good ones
// from the poisonous ones) and the hidden rock wall that descends with the forest map.
export const desafio2: Challenge = {
  id: 'desafio2',
  title: 'Bosque de la Oscuridad',
  Hud: Desafio2Hud,
  regions: ['valle', 'bosque'],
  // At the foot of the giant tree, by the elf.
  startPoint: { x: -36.4, y: 11.6, z: -122.5 },
  // In front of the elf's house, facing him and his tree (ground at 10.2).
  resumeAt: () => ({ x: -36.4, y: 11.9, z: -122.5, yaw: Math.PI }),
  World: Desafio2World,
  Dialogs: Desafio2Dialogs,
  backpack: DESAFIO2_BACKPACK,
  isCompleted: isDesafio2Completado,
};
