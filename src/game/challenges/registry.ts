import type { Region } from '@/game/world/regions';
import { desafio1 } from './desafio1';
import { desafio2 } from './desafio2';
import { desafio3 } from './desafio3';
import { relatoCierre } from './relatoCierre';
import type { Backpack, Challenge, Objective } from './types';
import type { GameProgress } from '@/store/progressStore';

// Every chapter of the story, in order. Adding a challenge = creating its folder with an index.ts that exports a
// Challenge, and listing it here (see README, "Cómo añadir un desafío").
export const CHALLENGES: readonly Challenge[] = [desafio1, desafio2, desafio3, relatoCierre];

// The backpack in use: that of the latest challenge whose backpack is already active.
export function activeBackpack(progress: GameProgress): Backpack | undefined {
  return CHALLENGES.findLast((challenge) => challenge.backpack?.isActive(progress))?.backpack;
}

// What the player has to do now: the objective of the first challenge not finished yet (null once the game is over).
// `region`: where the player is, so the objective follows a player who went into the dangerous place of the challenge.
export function currentObjective(progress: GameProgress, region?: Region): Objective | null {
  const current = CHALLENGES.find((challenge) => !challenge.isCompleted?.(progress));
  return current?.objective?.(progress, region !== undefined && current.danger?.region === region) ?? null;
}
