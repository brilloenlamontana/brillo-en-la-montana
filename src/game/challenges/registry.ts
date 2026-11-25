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
// Whether the player, in `region`, is inside the dangerous place of the challenge being played (its swamp, forest or
// tunnels).
export function inCurrentDanger(progress: GameProgress, region: Region | undefined): boolean {
  const current = CHALLENGES.find((challenge) => !challenge.isCompleted?.(progress));
  return region !== undefined && current?.danger?.region === region;
}

// `region`: where the player is, so the objective follows a player who went into the dangerous place of the challenge.
// The place of an objective is the way into that dangerous place: once the player is inside, it is no longer marked
// (no beacon, no dot on the map) and finding the way through is theirs.
export function currentObjective(progress: GameProgress, region?: Region): Objective | null {
  const current = CHALLENGES.find((challenge) => !challenge.isCompleted?.(progress));
  const there = inCurrentDanger(progress, region);
  const objective = current?.objective?.(progress, there) ?? null;
  return objective && there ? { text: objective.text } : objective;
}
