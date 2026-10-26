import { listText } from '@/game/challenges/listText';
import type { ItemState, MissionStep } from '@/game/challenges/types';
import type { GameProgress } from '@/store/progressStore';
import { ELFO_COLLECTIBLES, type ElfoItemId } from './items';

// Rules of Challenge 2 so far, as pure functions of the saved progress (shared with the admin dashboard). From the
// scene schedule: the forest has three dangers (wild goblins, poisonous fruit trees, shifting paths) and the elf's
// tools answer them; the elven sword defeats the goblins and the lens tells the good fruit from the poisonous one.

type Progress = Partial<GameProgress> | undefined;

// Goblins roaming the Dark Forest.
export const DUENDE_COUNT = 6;
// Good fruits the player has to eat to get through the forest's hunger.
export const FRUTOS_NEEDED = 3;

// Whether the forest fruit at this index (node order of BosqueManzanas.glb) is good. Fixed, so it is the same fruit
// for every player and every visit; about a third of them are good. They all look red: only the lens tells them apart.
export const isFrutoBueno = (index: number) => (Math.imul(index + 1, 2654435761) >>> 0) % 100 < 35;

const collected = (progress: Progress) => progress?.collectedItems ?? [];
const defeatedDuendes = (progress: Progress) => new Set(progress?.duendesDefeated ?? []).size;
export const frutosEaten = (progress: Progress) => new Set(progress?.frutosComidos ?? []).size;

export const allDuendesDefeated = (progress: Progress) => defeatedDuendes(progress) >= DUENDE_COUNT;
// Fed: the forest's hunger no longer applies.
export const isFed = (progress: Progress) => frutosEaten(progress) >= FRUTOS_NEEDED;

// The elf only waits at the foot of his tree once the swamp was crossed (Challenge 1 completed).
export const isElfoPresent = (progress: Progress) => progress?.mision1Completada === true;

// Accepting his help opens his door and fills the backpack with his tools.
export const isElfoHouseUnlocked = (progress: Progress) => progress?.elfoHelp === 'accepted';
export const isBackpackActive = isElfoHouseUnlocked;

// The sword leaves the backpack once every goblin is defeated; the lens once the player is fed.
export function getItemState(id: ElfoItemId, progress: Progress): ItemState {
  if (id === 'espada' && allDuendesDefeated(progress)) return 'spent';
  if (id === 'lente' && isFed(progress)) return 'spent';
  return collected(progress).includes(id) ? 'owned' : 'missing';
}

// How each tool is named in a sentence.
const ITEM_LABEL: Record<ElfoItemId, string> = { espada: 'la espada élfica', lente: 'el lente revelador', mapa: 'el mapa del bosque' };

// What the player has to do now (shown in the backpack).
export function getGoal(progress: Progress): string {
  const missing = ELFO_COLLECTIBLES.filter(({ id }) => !collected(progress).includes(id)).map(({ id }) => ITEM_LABEL[id]);
  if (missing.length) return `Sube a la casa del elfo, en la copa del árbol gigante, y recoge ${listText(missing)}.`;
  const tasks: string[] = [];
  const duendes = DUENDE_COUNT - defeatedDuendes(progress);
  if (duendes > 0) {
    tasks.push(
      `${duendes === DUENDE_COUNT ? 'Los duendes salvajes' : `Los ${duendes} duendes que quedan`} te perseguirán: acaba con ellos usando la espada cuando estén cerca.`,
    );
  }
  const frutos = FRUTOS_NEEDED - frutosEaten(progress);
  if (frutos > 0) {
    tasks.push(
      `El hambre te obligará a comer: mira por el lente y come ${frutos === 1 ? 'una fruta amarilla más' : `${frutos} frutas amarillas`}; las que siguen rojas son venenosas.`,
    );
  }
  if (tasks.length) return `Adéntrate en el Bosque de la Oscuridad. ${tasks.join(' ')}`;
  return 'Acabaste con los duendes y saciaste tu hambre. Sigue tu camino por el Bosque de la Oscuridad.';
}

const answerLabel = (help: string) => (help === 'accepted' ? 'Aceptó la ayuda' : help === 'rejected' ? 'Rechazó la ayuda' : 'Pendiente');

// Steps of Challenge 2 reached so far, as the admin dashboard shows them.
export function getDesafio2Summary(progress: Progress) {
  const elfo = progress?.elfoHelp ?? 'pending';
  const items = collected(progress);
  const duendes = defeatedDuendes(progress);
  const frutos = frutosEaten(progress);
  const steps: MissionStep[] = [
    {
      id: 'elfo',
      label: 'Aceptar la ayuda del elfo',
      detail: 'Al pie del árbol gigante, después de cruzar el pantano',
      done: elfo === 'accepted',
      status: progress?.interactedWithElfo ? answerLabel(elfo) : 'Sin hablar',
    },
    ...ELFO_COLLECTIBLES.map(({ id, name }) => ({ id: `recoger-${id}`, label: `Recoger: ${name}`, detail: 'Casa del elfo, en la copa del árbol', done: items.includes(id) })),
    { id: 'duendes', label: 'Acabar con los duendes', detail: 'Con la espada élfica, en el Bosque de la Oscuridad', done: duendes >= DUENDE_COUNT, status: `${duendes}/${DUENDE_COUNT}` },
    {
      id: 'frutos',
      label: 'Comer frutas buenas',
      detail: 'Las que el lente revelador muestra amarillas',
      done: frutos >= FRUTOS_NEEDED,
      status: `${Math.min(frutos, FRUTOS_NEEDED)}/${FRUTOS_NEEDED}`,
    },
  ];
  return { unlocked: isElfoPresent(progress), steps, done: steps.filter((step) => step.done).length, total: steps.length };
}
