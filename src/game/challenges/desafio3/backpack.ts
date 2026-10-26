import type { Backpack } from '@/game/challenges/types';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { BrujulaIcon, GuanteIcon, MunecaIcon } from './ItemIcons';
import { HEDRIG_COLLECTIBLES, type HedrigItemId } from './items';
import { getGoal, getItemState, isBackpackActive } from './mission';

const toast = (message: string) => useToastStore.getState().showToast(message);
const MODEL = Object.fromEntries(HEDRIG_COLLECTIBLES.map(({ id, url }) => [id, url])) as Record<HedrigItemId, string>;

// What each item is for. Their effects arrive with the Ogre, the tunnels and the spectre; for now using one recalls
// its purpose.
const PURPOSE: Record<HedrigItemId, string> = {
  guante: 'Con el guante de minero podrás ganarle el pulso al ogro que vigila el sendero.',
  brujula: 'La brújula te guiará por los túneles derrumbados de la montaña.',
  muneca: 'La muñeca se llama Simona: el espectro de la niña la está buscando.',
};

// Backpack of Challenge 3: replaces the elf's once the player arrives at Hedrig's mining town.
export const DESAFIO3_BACKPACK: Backpack = {
  items: [
    { id: 'guante', name: 'Guante de minero', model: MODEL.guante, Icon: GuanteIcon, hotkey: '1' },
    { id: 'brujula', name: 'Brújula', model: MODEL.brujula, Icon: BrujulaIcon, hotkey: '2' },
    { id: 'muneca', name: 'Muñeca de trapo', model: MODEL.muneca, Icon: MunecaIcon, hotkey: '3' },
  ],
  isActive: isBackpackActive,
  stateOf: (id, progress) => getItemState(id as HedrigItemId, progress),
  hint: () => 'En la casa de Hedrig',
  goal: getGoal,
  use: (id) => {
    if (getItemState(id as HedrigItemId, useProgressStore.getState().progress) === 'owned') toast(PURPOSE[id as HedrigItemId]);
  },
};
