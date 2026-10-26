import type { Point } from '@/game/player/playerStore';
import { useZoneStore } from '@/game/world/zoneStore';
import { saveProgress } from '@/services/progressService';
import { STARS, STORY_START, useProgressStore, type GameProgress } from '@/store/progressStore';
import { useUIStore } from '@/store/uiStore';
import { CHALLENGES } from './registry';
import type { Challenge } from './types';

// Progress through the story and what a defeat costs. The game simulates low academic performance: every defeat is
// a "bajo" and costs one of the three stars.
//   1st bajo: back to the start of the challenge where it happened; what was achieved is kept.
//   2nd bajo: back to Villa Boj and the whole story starts over (every challenge from scratch).
//   3rd bajo: the run is over; like losing the place in a degree, a new character has to be chosen and the story
//             starts from the very beginning with the three stars back.

export type Bajo = 1 | 2 | 3;
export const bajoDialog = (bajo: Bajo) => `bajo.${bajo}`;

// The first challenge not finished yet (the last one once everything is finished).
export const currentChallenge = (progress: GameProgress): Challenge =>
  CHALLENGES.find((challenge) => !challenge.isCompleted?.(progress)) ?? CHALLENGES[CHALLENGES.length - 1];

// The challenge the player is in: the one that owns the current map region.
const challengeHere = (progress: GameProgress): Challenge =>
  CHALLENGES.find((challenge) => challenge.regions.includes(useZoneStore.getState().region)) ?? currentChallenge(progress);

const increment = (counts: Record<string, number>, key: string) => ({ ...counts, [key]: (counts[key] ?? 0) + 1 });

// Called when the defeated player comes back: records the bajo, applies its cost and returns where to respawn.
export function handleDefeat(): Point {
  const { progress } = useProgressStore.getState();
  const challenge = challengeHere(progress);
  const estrellas = progress.estrellas - 1;
  const bajo = (STARS - estrellas) as Bajo;
  const derrotas = increment(progress.derrotas, challenge.id);
  const villa = CHALLENGES[0].startPoint;

  if (bajo === 1) {
    saveProgress({ derrotas, estrellas });
  } else if (bajo === 2) {
    saveProgress({ ...STORY_START, derrotas, estrellas, reinicios: increment(progress.reinicios, 'segundoBajo') });
  } else {
    // The three stars come back with the new character (chosen when the dialog is closed, see BajoDialog).
    saveProgress({ ...STORY_START, derrotas, estrellas: STARS, reinicios: increment(progress.reinicios, 'tercerBajo') });
  }
  useUIStore.getState().openDialog(bajoDialog(bajo));
  return bajo === 1 ? challenge.startPoint : villa;
}
