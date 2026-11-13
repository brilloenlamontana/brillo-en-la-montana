import { listText } from '@/game/challenges/listText';
import type { ItemState, MissionStep } from '@/game/challenges/types';
import type { GameProgress } from '@/store/progressStore';
import { POTION_IDS, type BackpackItemId } from './items';

// Rules of Challenge 1, as pure functions of the saved progress (no React, no three.js): the game and the admin
// dashboard read the same truth.

// Zumbadores hidden in the swamp wells.
export const ZUMBADOR_COUNT = 10;

type Progress = Partial<GameProgress> | undefined;

const collected = (progress: Progress) => progress?.collectedItems ?? [];
const defeatedZumbadores = (progress: Progress) => new Set(progress?.zumbadoresDefeated ?? []).size;

export const countPociones = (progress: Progress) => POTION_IDS.filter((id) => collected(progress).includes(id)).length;
export const allZumbadoresDefeated = (progress: Progress) => defeatedZumbadores(progress) >= ZUMBADOR_COUNT;

// Imeri's door only opens after accepting the villager's help (she waits at home) and then hers.
export const isHouseUnlocked = (progress: Progress) => progress?.aldeanoHelp === 'accepted' && progress?.imeriHelp === 'accepted';
export const isBackpackActive = (progress: Progress) => progress?.imeriHelp === 'accepted';

// With the golem and every zumbador defeated the wells swallow no one anymore (and the rope is no longer needed).
export const areWellsSafe = (progress: Progress) => progress?.golemDefeated === true && allZumbadoresDefeated(progress);

// Challenge 1 is done once the swamp is safe. The saved flag (mision1Completada, with its date) records that moment;
// the rule also counts on its own, so a save that has the swamp cleared but lacks the flag never blocks the story
// (StoryFlags writes the missing flag back).
export const isDesafio1Completado = (progress: Progress) => progress?.mision1Completada === true || areWellsSafe(progress);

// Each item leaves the backpack once it fulfilled its purpose: the gem when the golem goes off, the insecticide (the
// five potions) with the last zumbador, and the rope when no enemy is left.
export function getItemState(id: BackpackItemId, progress: Progress): ItemState {
  const items = collected(progress);
  if (id === 'gema') return progress?.golemDefeated ? 'spent' : items.includes('gema') ? 'owned' : 'missing';
  if (id === 'soga') return areWellsSafe(progress) ? 'spent' : items.includes('soga') ? 'owned' : 'missing';
  if (allZumbadoresDefeated(progress)) return 'spent';
  return countPociones(progress) === POTION_IDS.length ? 'owned' : 'missing';
}

export const hasItem = (id: BackpackItemId, progress: Progress) => getItemState(id, progress) === 'owned';

// What the player has to do now (shown in the backpack): first what is left to pick up in Imeri's house, then what
// is left to defeat in the swamp.
export function getGoal(progress: Progress): string {
  if (isDesafio1Completado(progress)) return '¡Atravesaste el pantano! Busca la casa del elfo, suspendida de un árbol al otro lado.';
  const items = collected(progress);
  const pociones = POTION_IDS.length - countPociones(progress);
  const missing = [...(items.includes('gema') ? [] : ['la gema']), ...(items.includes('soga') ? [] : ['la soga'])];
  if (pociones > 0) missing.push(pociones === POTION_IDS.length ? 'las 5 pociones' : pociones === 1 ? 'la última poción' : `${pociones} pociones más`);
  if (missing.length) {
    return `Recoge en la casa de Imeri: ${listText(missing)}.${pociones > 0 ? ' Con las pociones preparas el insecticida.' : ''}`;
  }
  const zumbadores = ZUMBADOR_COUNT - defeatedZumbadores(progress);
  const tasks = [
    ...(progress?.golemDefeated ? [] : ['apaga al Golem con la gema']),
    ...(zumbadores > 0 ? [`acaba con ${zumbadores === ZUMBADOR_COUNT ? 'los zumbadores' : `los ${zumbadores} zumbadores que quedan`} con el insecticida`] : []),
  ];
  return `En el Pantano de la Tristeza, ${listText(tasks)}. Si caes en un pozo, usa la soga para salir.`;
}

const answerLabel = (help: string) => (help === 'accepted' ? 'Aceptó la ayuda' : help === 'rejected' ? 'Rechazó la ayuda' : 'Pendiente');

// Steps of Challenge 1 in order, as the admin dashboard shows them for each player.
function getMissionSteps(progress: Progress): MissionStep[] {
  const items = collected(progress);
  const pociones = countPociones(progress);
  const zumbadores = defeatedZumbadores(progress);
  const aldeana = progress?.aldeanoHelp ?? 'pending';
  const imeri = progress?.imeriHelp ?? 'pending';

  return [
    { id: 'carta', label: 'Leer el anuncio del alcalde', detail: 'Tablón de anuncios junto al portón de la Villa de Boj', done: progress?.openedMayorLetter === true },
    { id: 'aldeana', label: 'Aceptar la ayuda de la aldeana', detail: 'Junto al pozo de la plaza de la Villa de Boj', done: aldeana === 'accepted', status: answerLabel(aldeana) },
    { id: 'imeri', label: 'Aceptar la ayuda de Imeri', detail: 'Frente a su casa; abre la puerta y activa la mochila', done: imeri === 'accepted', status: progress?.interactedWithImeri ? answerLabel(imeri) : 'Sin hablar' },
    { id: 'gema', label: 'Recoger la gema', detail: 'Interior de la casa de Imeri', done: items.includes('gema') },
    { id: 'soga', label: 'Recoger la soga', detail: 'Interior de la casa de Imeri', done: items.includes('soga') },
    { id: 'insecticida', label: 'Preparar el insecticida', detail: 'Recoger las 5 pociones', done: pociones === POTION_IDS.length, status: `${pociones}/${POTION_IDS.length} pociones` },
    { id: 'zumbadores', label: 'Acabar con los zumbadores', detail: 'Con el insecticida, en el Pantano de la Tristeza', done: zumbadores >= ZUMBADOR_COUNT, status: `${zumbadores}/${ZUMBADOR_COUNT}` },
    { id: 'golem', label: 'Desactivar al Golem', detail: 'Con la gema, en el Pantano de la Tristeza', done: progress?.golemDefeated === true },
  ];
}

export function getMissionSummary(progress: Progress) {
  const steps = getMissionSteps(progress);
  const done = steps.filter((step) => step.done).length;
  return { steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), completed: isDesafio1Completado(progress) };
}
