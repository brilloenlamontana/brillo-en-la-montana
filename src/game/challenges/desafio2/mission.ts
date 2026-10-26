import type { ItemState, MissionStep } from '@/game/challenges/types';
import type { GameProgress } from '@/store/progressStore';
import { ELFO_COLLECTIBLES, type ElfoItemId } from './items';

// Rules of Challenge 2 so far, as pure functions of the saved progress (shared with the admin dashboard).

type Progress = Partial<GameProgress> | undefined;

const collected = (progress: Progress) => progress?.collectedItems ?? [];

// The elf only waits at the foot of his tree once the swamp was crossed (Challenge 1 completed).
export const isElfoPresent = (progress: Progress) => progress?.mision1Completada === true;

// Accepting his help opens his door and fills the backpack with his tools.
export const isElfoHouseUnlocked = (progress: Progress) => progress?.elfoHelp === 'accepted';
export const isBackpackActive = isElfoHouseUnlocked;

export const getItemState = (id: ElfoItemId, progress: Progress): ItemState => (collected(progress).includes(id) ? 'owned' : 'missing');

const answerLabel = (help: string) => (help === 'accepted' ? 'Aceptó la ayuda' : help === 'rejected' ? 'Rechazó la ayuda' : 'Pendiente');

// Steps of Challenge 2 reached so far, as the admin dashboard shows them.
export function getDesafio2Summary(progress: Progress) {
  const elfo = progress?.elfoHelp ?? 'pending';
  const items = collected(progress);
  const steps: MissionStep[] = [
    {
      id: 'elfo',
      label: 'Aceptar la ayuda del elfo',
      detail: 'Al pie del árbol gigante, después de cruzar el pantano',
      done: elfo === 'accepted',
      status: progress?.interactedWithElfo ? answerLabel(elfo) : 'Sin hablar',
    },
    ...ELFO_COLLECTIBLES.map(({ id, name }) => ({ id, label: `Recoger: ${name}`, detail: 'Casa del elfo, en la copa del árbol', done: items.includes(id) })),
  ];
  return { unlocked: isElfoPresent(progress), steps, done: steps.filter((step) => step.done).length, total: steps.length };
}
