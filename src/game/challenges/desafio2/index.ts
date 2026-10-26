import type { Challenge } from '@/game/challenges/types';
import { DESAFIO2_BACKPACK } from './backpack';
import { Desafio2Dialogs } from './Desafio2Dialogs';
import { Desafio2Hud } from './Desafio2Hud';
import { Desafio2World } from './Desafio2World';

// Challenge 2 — Dark Forest. So far: the elf (after Challenge 1), his help, his house, his tools in the backpack, the
// wild goblins (defeated with the elven sword) and the forest's hunger with its fruit (only the lens tells the good
// ones from the poisonous ones). A first "bajo" here sends the player back to the elf's house.
export const desafio2: Challenge = {
  id: 'desafio2',
  title: 'Bosque de la Oscuridad',
  Hud: Desafio2Hud,
  regions: ['valle', 'bosque'],
  // At the foot of the giant tree, by the elf.
  startPoint: { x: -36.4, y: 11.6, z: -122.5 },
  World: Desafio2World,
  Dialogs: Desafio2Dialogs,
  backpack: DESAFIO2_BACKPACK,
};
