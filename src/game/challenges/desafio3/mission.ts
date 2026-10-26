import { listText } from '@/game/challenges/listText';
import type { ItemState } from '@/game/challenges/types';
import type { GameProgress } from '@/store/progressStore';
import { HEDRIG_COLLECTIBLES, type HedrigItemId } from './items';

// Rules of Challenge 3 so far, as pure functions of the saved progress. From the scene schedule: Hedrig, the dwarf
// miner, lends three things for the climb to the summit; the glove beats the Ogre who guards the path at arm
// wrestling, the compass guides through the collapsed tunnels and the doll (Simona) calms the spectre of the girl.

type Progress = Partial<GameProgress> | undefined;

const collected = (progress: Progress) => progress?.collectedItems ?? [];

// Challenge 2 passed: the way to Hedrig's town is open.
export const isUnlocked = (progress: Progress) => progress?.mision2Completada === true;

// The player arrived at the mining town after the forest: from then on the backpack is Hedrig's.
export const hasArrived = (progress: Progress) => progress?.llegoAlPueblo === true;
export const isBackpackActive = hasArrived;

export function getItemState(id: HedrigItemId, progress: Progress): ItemState {
  return collected(progress).includes(id) ? 'owned' : 'missing';
}

// How each item is named in a sentence.
const ITEM_LABEL: Record<HedrigItemId, string> = { guante: 'el guante de minero', brujula: 'la brújula', muneca: 'la muñeca de trapo' };

// What the player has to do now (shown in the backpack).
export function getGoal(progress: Progress): string {
  const missing = HEDRIG_COLLECTIBLES.filter(({ id }) => !collected(progress).includes(id)).map(({ id }) => ITEM_LABEL[id]);
  if (missing.length) {
    return `Llegaste al pueblo minero, al pie de la Cumbre de la Desolación. Busca a Hedrig, la enana minera, junto a la fogata de su casa; en su hogar encontrarás ${listText(missing)}.`;
  }
  return 'Sube hacia la cumbre: el guante te servirá contra el ogro, la brújula en los túneles y la muñeca ante el espectro de la niña.';
}
