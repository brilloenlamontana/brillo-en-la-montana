import { useEffect } from 'react';
import { saveProgress } from '@/services/progressService';
import { useProgressStore, type GameProgress } from '@/store/progressStore';
import { isDesafio1Completado } from './desafio1/mission';
import { isDesafio2Completado } from './desafio2/mission';

// The story only asks for the challenges, never for the bonuses: each one opens the next as soon as its own rule is
// met (see each mission.ts). A save can hold a challenge done by its rule but without its "completed" flag (made by
// an older version of the game, or cut off mid-save); the game already treats it as done, and this writes the flag
// and its date back so the saved game, the dashboard and the victory summary agree. It only adds fields: it never
// removes or resets anything.
function missingFlags(progress: GameProgress): Partial<GameProgress> | null {
  const now = new Date().toISOString();
  const changes: Partial<GameProgress> = {};
  if (!progress.mision1Completada && isDesafio1Completado(progress)) Object.assign(changes, { mision1Completada: true, mision1CompletadaEn: now });
  if (!progress.mision2Completada && isDesafio2Completado(progress)) Object.assign(changes, { mision2Completada: true, mision2CompletadaEn: now });
  return Object.keys(changes).length ? changes : null;
}

export function StoryFlags() {
  useEffect(() => {
    const check = ({ progress }: { progress: GameProgress }) => {
      const changes = missingFlags(progress);
      if (changes) void saveProgress(changes);
    };
    check(useProgressStore.getState());
    return useProgressStore.subscribe(check);
  }, []);
  return null;
}
