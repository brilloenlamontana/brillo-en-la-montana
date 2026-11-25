import type { Hint, ItemState, MissionStep, Objective } from '@/game/challenges/types';
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

// Where each step of Challenge 3 happens (the ground there): Hedrig by her bonfire and the mouth of the mine.
const HEDRIG = { x: 82.6, y: 23.8, z: -206.3 };
const MINA = { x: 99, y: 24, z: -194 };

// The step of Challenge 3 the player is on, in one line, and where it happens (inside the tunnels the compass guides).
export function getObjective(progress: Progress, there = false): Objective {
  if (!hasArrived(progress)) return { text: 'Sigue las flechas doradas del suelo hasta el pueblo minero.', at: HEDRIG };
  if (!isHedrigHouseUnlocked(progress)) {
    const text =
      progress?.hedrigHelp === 'rejected'
        ? 'Vuelve con Hedrig y acepta su ayuda: sin sus objetos no pasarás los túneles.'
        : 'Habla con Hedrig, la enana minera, junto a la fogata de su casa.';
    return { text, at: HEDRIG };
  }
  // General on purpose: it names everything Hedrig offers, not what this player still lacks. Whoever walks into the
  // tunnels without something has chosen to: from then on the objective is the tunnels'.
  if (HEDRIG_COLLECTIBLES.some(({ id }) => !hasCollected(id, progress)) && !there) {
    return { text: 'Entra a la casa de Hedrig y recoge lo que te ofrece: el guante de minero, la brújula y la muñeca de trapo.', at: HEDRIG };
  }
  if (!isOgroVencido(progress)) return { text: 'Cruza los Túneles de la Cumbre.', at: MINA };
  return { text: 'El ogro te dejó pasar: sube la escalera de piedra hasta la cumbre.' };
}

// What Hedrig says, in a few words, to a player who already accepted her help: what to do now. Each one is a fixed
// line, so her recorded voice says the same words.
export function getHedrigHint(progress: Progress): Hint {
  if (isDesafio3Completado(progress)) {
    return {
      voice: '03_hedrig_08',
      paragraphs: ['¡Llegaste a la cumbre y volviste para contarlo! Sube otra vez y sigue la avenida hasta el santuario del resplandor verde: allí está lo que buscas.'],
    };
  }
  if (HEDRIG_COLLECTIBLES.some(({ id }) => !hasCollected(id, progress))) {
    return {
      voice: '03_hedrig_05',
      paragraphs: ['Mi casa está abierta. Entra y recoge el guante de minero, la brújula y la muñeca de trapo. Lo que tomes queda en tu mochila.'],
    };
  }
  if (isOgroVencido(progress)) {
    return { voice: '03_hedrig_07', paragraphs: ['¡Le ganaste al ogro! Ya nada te cierra el paso: vuelve a su sala y sube la escalera de piedra hasta la cumbre.'] };
  }
  return {
    voice: '03_hedrig_06',
    paragraphs: [
      'Ya llevas todo. Entra a los túneles por la boca de la mina: allá adentro te esperan la oscuridad, el espectro de la niña y el ogro. Para qué sirve cada cosa tendrás que descubrirlo tú.',
    ],
  };
}

// Said on walking back out of the tunnels with the spectre or the Ogre still in the way: only that they are not
// passed (nothing once the Ogre is beaten: the way up is open).
export function getPending(progress: Progress): string | null {
  return isDesafio3Completado(progress) || isOgroVencido(progress) ? null : 'Aún no has superado los Túneles de la Cumbre.';
}

// What the player has to do now (shown in the backpack).
export function getGoal(progress: Progress): string {
  if (isDesafio3Completado(progress)) {
    return '¡Llegaste a la Cumbre de la Desolación! Sigue la avenida hasta el santuario del resplandor verde.';
  }
  if (!isHedrigHouseUnlocked(progress)) {
    return 'Llegaste al pueblo minero, al pie de la Cumbre de la Desolación. Habla con Hedrig, la enana minera, junto a la fogata de su casa, y acepta su ayuda.';
  }
  if (HEDRIG_COLLECTIBLES.some(({ id }) => !hasCollected(id, progress))) return 'En la casa de Hedrig te esperan el guante de minero, la brújula y la muñeca de trapo.';
  if (!isOgroVencido(progress)) return 'Cruza los Túneles de la Cumbre.';
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
