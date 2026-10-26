import type { Challenge } from '@/game/challenges/types';
import { RESPAWN_POINT } from '@/game/player/spawn';
import { DESAFIO1_BACKPACK } from './backpack';
import { Desafio1Dialogs } from './Desafio1Dialogs';
import { Desafio1World } from './Desafio1World';

// Challenge 1 — Swamp of Sadness. The mayor's letter, the villager, Imeri and her house, the swamp with its traps
// and enemies. Rules in mission.ts, items in items.ts and backpack.ts.
export const desafio1: Challenge = {
  id: 'desafio1',
  title: 'Pantano de la Tristeza',
  World: Desafio1World,
  Dialogs: Desafio1Dialogs,
  backpack: DESAFIO1_BACKPACK,
  regions: ['villa', 'camino', 'casa', 'pantano'],
  // The Villa Boj square.
  startPoint: RESPAWN_POINT,
  isCompleted: (progress) => progress.mision1Completada,
};
