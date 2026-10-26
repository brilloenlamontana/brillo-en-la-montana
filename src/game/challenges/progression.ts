import { saveProgress } from '@/services/progressService';
import { STARS_PER_CHALLENGE, useProgressStore, type GameProgress } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';
import { CHALLENGES } from './registry';
import type { Challenge } from './types';

// Progress through the story: which challenge is being played and what a defeat costs in it.

export const DEFEAT_DIALOG = 'derrota';

// The first challenge not finished yet (the last one once everything is finished).
export const currentChallenge = (progress: GameProgress): Challenge =>
  CHALLENGES.find((challenge) => !challenge.isCompleted?.(progress)) ?? CHALLENGES[CHALLENGES.length - 1];

const increment = (counts: Record<string, number>, id: string) => ({ ...counts, [id]: (counts[id] ?? 0) + 1 });

// The player was defeated and is back in Villa Boj: one star less in the current challenge. Losing the last star
// restarts the challenge (its restart.reset) with a full set of stars, and the defeat dialog explains it.
export function loseStar() {
  const { progress } = useProgressStore.getState();
  const challenge = currentChallenge(progress);
  const derrotas = increment(progress.derrotas, challenge.id);
  const estrellas = progress.estrellas - 1;

  if (estrellas > 0) {
    saveProgress({ derrotas, estrellas });
    useToastStore.getState().showToast(estrellas === 1 ? 'Perdiste una estrella. Te queda una.' : `Perdiste una estrella. Te quedan ${estrellas}.`);
    return;
  }

  saveProgress({
    ...challenge.restart?.reset(progress),
    derrotas,
    reinicios: increment(progress.reinicios, challenge.id),
    estrellas: STARS_PER_CHALLENGE,
  });
  useUIStore.getState().openDialog(DEFEAT_DIALOG);
}
