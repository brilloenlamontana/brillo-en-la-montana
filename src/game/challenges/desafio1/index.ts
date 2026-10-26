import type { Challenge } from '@/game/challenges/types';
import { DESAFIO1_BACKPACK } from './backpack';
import { Desafio1Dialogs } from './Desafio1Dialogs';
import { Desafio1World } from './Desafio1World';
import { IMERI_COLLECTIBLES } from './items';

const IMERI_ITEM_IDS: readonly string[] = IMERI_COLLECTIBLES.map(({ id }) => id);

// Challenge 1 — Swamp of Sadness. The mayor's letter, the villager, Imeri and her house, the swamp with its traps
// and enemies. Rules in mission.ts, items in items.ts and backpack.ts.
export const desafio1: Challenge = {
  id: 'desafio1',
  title: 'Pantano de la Tristeza',
  World: Desafio1World,
  Dialogs: Desafio1Dialogs,
  backpack: DESAFIO1_BACKPACK,
  isCompleted: (progress) => progress.mision1Completada,
  // Losing the three stars: the items go back to Imeri's house and the enemies to their wells. The answers given to the
  // villager and to Imeri are kept.
  restart: {
    message: [
      'El pantano pudo contigo. Imeri te encontró inconsciente entre el lodo y te llevó de vuelta a la villa.',
      'El desafío empieza de nuevo: la gema, la soga y las pociones regresaron a la casa de Imeri, y el Golem y los zumbones esperan otra vez en los pozos. Tienes de nuevo tres estrellas.',
    ],
    reset: (progress) => ({
      collectedItems: progress.collectedItems.filter((id) => !IMERI_ITEM_IDS.includes(id)),
      golemDefeated: false,
      zumbadoresDefeated: [],
    }),
  },
};
