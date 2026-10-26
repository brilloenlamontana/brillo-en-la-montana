import type { Challenge } from '@/game/challenges/types';
import { DESAFIO2_BACKPACK } from './backpack';
import { Desafio2Dialogs } from './Desafio2Dialogs';
import { Desafio2World } from './Desafio2World';

// Challenge 2 — Dark Forest. So far: the elf (after Challenge 1), his help, his house and his tools in the backpack.
// The forest itself is only rendered; its dangers come next.
export const desafio2: Challenge = {
  id: 'desafio2',
  title: 'Bosque de la Oscuridad',
  World: Desafio2World,
  Dialogs: Desafio2Dialogs,
  backpack: DESAFIO2_BACKPACK,
};
