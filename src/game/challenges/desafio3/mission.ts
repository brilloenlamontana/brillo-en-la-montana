import { listText } from '@/game/challenges/listText';
import type { ItemState, MissionStep, Objective } from '@/game/challenges/types';
import type { GameProgress } from '@/store/progressStore';
import { isDesafio2Completado } from '../desafio2/mission';
import { HEDRIG_COLLECTIBLES, type HedrigItemId } from './items';

// Rules of Challenge 3, as pure functions of the saved progress (shared with the admin dashboard). From the scene
// schedule: Hedrig, the dwarf miner, lends three things for the climb to the summit; the compass guides through the
// collapsed tunnels, the doll (Simona) calms the spectre of the girl and the glove beats the Ogre who guards the way up
// at arm wrestling.

type Progress = Partial<GameProgress> | undefined;

const collected = (progress: Progress) => progress?.collectedItems ?? [];
export const hasCollected = (id: HedrigItemId, progress: Progress) => collected(progress).includes(id);

// Challenge 2 passed: the way to Hedrig's town is open.
// Hedrig waits in her town once the forest is crossed: Challenge 2 done by its own rule (bonuses never count).
export const isUnlocked = (progress: Progress) => isDesafio2Completado(progress);

// The player arrived at the mining town after the forest: from then on the backpack is Hedrig's.
export const hasArrived = (progress: Progress) => progress?.llegoAlPueblo === true;
export const isBackpackActive = hasArrived;

// Accepting Hedrig's help unlocks her door: the glove, the compass and the doll can be picked up.
export const isHedrigHouseUnlocked = (progress: Progress) => progress?.hedrigHelp === 'accepted';

export const isEspectroCalmado = (progress: Progress) => progress?.espectroCalmado === true;
export const isOgroVencido = (progress: Progress) => progress?.ogroVencido === true;
// Finished once the player comes out on the summit (only possible past the Ogre).
export const isDesafio3Completado = (progress: Progress) => progress?.mision3Completada === true;

// Each item leaves the backpack once it fulfilled its purpose: the doll when the girl receives it, the glove when the
// Ogre is beaten and the compass on the summit.
export function getItemState(id: HedrigItemId, progress: Progress): ItemState {
  if (id === 'muneca' && isEspectroCalmado(progress)) return 'spent';
  if (id === 'guante' && isOgroVencido(progress)) return 'spent';
  if (id === 'brujula' && isDesafio3Completado(progress)) return 'spent';
  return hasCollected(id, progress) ? 'owned' : 'missing';
}

// How each item is named in a sentence.
const ITEM_LABEL: Record<HedrigItemId, string> = { guante: 'el guante de minero', brujula: 'la brújula', muneca: 'la muñeca de trapo' };

// Where each step of Challenge 3 happens (the ground there): Hedrig by her bonfire and the mouth of the mine.
const HEDRIG = { x: 82.6, y: 23.8, z: -206.3 };
const MINA = { x: 99, y: 24, z: -194 };

// The step of Challenge 3 the player is on, in one line, and where it happens (inside the tunnels the compass guides).
export function getObjective(progress: Progress): Objective {
  if (!hasArrived(progress)) return { text: 'Sigue las flechas doradas del suelo hasta el pueblo minero.', at: HEDRIG };
  if (!isHedrigHouseUnlocked(progress)) {
    const text =
      progress?.hedrigHelp === 'rejected'
        ? 'Vuelve con Hedrig y acepta su ayuda: sin sus objetos no pasarás los túneles.'
        : 'Habla con Hedrig, la enana minera, junto a la fogata de su casa.';
    return { text, at: HEDRIG };
  }
  const missing = HEDRIG_COLLECTIBLES.filter(({ id }) => !hasCollected(id, progress)).map(({ id }) => ITEM_LABEL[id]);
  if (missing.length) return { text: `Entra a la casa de Hedrig y recoge ${listText(missing)}.`, at: HEDRIG };
  if (!isEspectroCalmado(progress)) return { text: 'Entra a los túneles por la boca de la mina, guíate con la brújula y calma al espectro con la muñeca.', at: MINA };
  if (!isOgroVencido(progress)) return { text: 'Sigue la brújula hasta la sala del ogro y véncelo en el pulso con el guante.', at: MINA };
  return { text: 'El ogro te dejó pasar: sube la escalera de piedra hasta la cumbre.' };
}

// What is left to do in the tunnels (the climb after the Ogre needs no telling).
function tunnelTasks(progress: Progress): string[] {
  return [...(isEspectroCalmado(progress) ? [] : ['calma al espectro de la niña con la muñeca']), ...(isOgroVencido(progress) ? [] : ['vence al ogro en el pulso con el guante'])];
}

// What the player still has to fetch before the tunnels can be passed, and from whom; null when nothing is missing.
function tunnelLack(progress: Progress): string | null {
  if (!isHedrigHouseUnlocked(progress)) return 'vuelve con Hedrig, junto a la fogata de su casa, y acepta su ayuda';
  const missing = HEDRIG_COLLECTIBLES.filter(({ id }) => getItemState(id, progress) === 'missing').map(({ id }) => ITEM_LABEL[id]);
  return missing.length ? `vuelve a la casa de Hedrig y recoge ${listText(missing)}` : null;
}

// Said at the mouth of the mine on walking into the tunnels without what it takes to pass them.
export function getUnprepared(progress: Progress): string | null {
  if (isDesafio3Completado(progress)) return null;
  const lack = tunnelLack(progress);
  return lack ? `¡Cuidado! No estás listo para los túneles: te perderás, y el espectro y el ogro te quitarán la vida. Antes, ${lack}.` : null;
}

// Said on walking back out of the tunnels with the spectre or the Ogre still in the way.
export function getPending(progress: Progress): string | null {
  const tasks = tunnelTasks(progress);
  if (isDesafio3Completado(progress) || !tasks.length) return null;
  const lack = tunnelLack(progress);
  return `Los Túneles de la Cumbre siguen pendientes: ${listText(tasks)}. ${lack ? `Para eso, ${lack}. ` : ''}Sin eso no hay paso a la cumbre.`;
}

// What the player has to do now (shown in the backpack).
export function getGoal(progress: Progress): string {
  if (isDesafio3Completado(progress)) {
    return '¡Llegaste a la Cumbre de la Desolación! Sigue la avenida hasta el santuario del resplandor verde.';
  }
  if (!isHedrigHouseUnlocked(progress)) {
    return 'Llegaste al pueblo minero, al pie de la Cumbre de la Desolación. Habla con Hedrig, la enana minera, junto a la fogata de su casa, y acepta su ayuda.';
  }
  const missing = HEDRIG_COLLECTIBLES.filter(({ id }) => !hasCollected(id, progress)).map(({ id }) => ITEM_LABEL[id]);
  if (missing.length) return `Entra a la casa de Hedrig y recoge ${listText(missing)}.`;
  const tasks: string[] = [];
  if (!isEspectroCalmado(progress)) tasks.push('entrégale la muñeca al espectro de la niña cuando te alcance');
  if (!isOgroVencido(progress)) tasks.push('vence al ogro en la mesa de pulso con el guante');
  if (tasks.length) return `Entra a los túneles por la boca de la mina y usa la brújula para no perderte; ${listText(tasks)}.`;
  return 'El ogro te dejó pasar: sube la escalera de piedra hasta la cumbre.';
}

const answerLabel = (help: string) => (help === 'accepted' ? 'Aceptó la ayuda' : help === 'rejected' ? 'Rechazó la ayuda' : 'Pendiente');

// Steps of Challenge 3 in order, as the admin dashboard shows them for each player.
export function getDesafio3Summary(progress: Progress) {
  const hedrig = progress?.hedrigHelp ?? 'pending';
  const completed = isDesafio3Completado(progress);
  const steps: MissionStep[] = [
    { id: 'pueblo', label: 'Llegar al pueblo minero', detail: 'Al pie de la Cumbre de la Desolación, tras el bosque', done: hasArrived(progress) },
    {
      id: 'hedrig',
      label: 'Aceptar la ayuda de Hedrig',
      detail: 'Junto a la fogata de su casa; abre la puerta',
      done: hedrig === 'accepted',
      status: progress?.interactedWithHedrig ? answerLabel(hedrig) : 'Sin hablar',
    },
    ...HEDRIG_COLLECTIBLES.map(({ id, name }) => ({ id: `recoger-${id}`, label: `Recoger: ${name}`, detail: 'Interior de la casa de Hedrig', done: hasCollected(id, progress) })),
    { id: 'espectro', label: 'Calmar al espectro de la niña', detail: 'Entregándole la muñeca Simona en los túneles', done: isEspectroCalmado(progress) },
    { id: 'ogro', label: 'Vencer al ogro en el pulso', detail: 'Con el guante de minero, en la sala previa a la escalera', done: isOgroVencido(progress) },
    { id: 'cumbre', label: 'Salir a la cumbre', detail: 'Por la escalera de piedra, al final del laberinto', done: completed },
  ];
  const done = steps.filter((step) => step.done).length;
  return { unlocked: isUnlocked(progress), steps, done, total: steps.length, percent: Math.round((done / steps.length) * 100), completed };
}
