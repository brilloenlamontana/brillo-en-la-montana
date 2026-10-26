import { desafio1 } from './desafio1';
import { desafio2 } from './desafio2';
import { desafio3 } from './desafio3';
import { relatoCierre } from './relatoCierre';
import type { Backpack, Challenge } from './types';
import type { GameProgress } from '@/store/progressStore';

// Every chapter of the story, in order. Adding a challenge = creating its folder with an index.ts that exports a
// Challenge, and listing it here (see README, "Cómo añadir un desafío").
export const CHALLENGES: readonly Challenge[] = [desafio1, desafio2, desafio3, relatoCierre];

// The backpack in use: that of the latest challenge whose backpack is already active.
export function activeBackpack(progress: GameProgress): Backpack | undefined {
  return CHALLENGES.findLast((challenge) => challenge.backpack?.isActive(progress))?.backpack;
}
