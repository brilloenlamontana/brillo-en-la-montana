import type { Backpack } from '@/game/challenges/types';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { EspadaIcon, LenteIcon, MapaIcon } from './ItemIcons';
import { ELFO_COLLECTIBLES, type ElfoItemId } from './items';
import { getGoal, getItemState, isBackpackActive } from './mission';

const toast = (message: string) => useToastStore.getState().showToast(message);
const MODEL = Object.fromEntries(ELFO_COLLECTIBLES.map(({ id, url }) => [id, url])) as Record<ElfoItemId, string>;

// What each tool is for. Their effects arrive with the Dark Forest mechanics; for now using one recalls its purpose.
const PURPOSE: Record<ElfoItemId, string> = {
  espada: 'La espada élfica te defenderá de los duendes salvajes del bosque.',
  lente: 'El lente revela cuáles frutos del bosque son venenosos.',
  mapa: 'El mapa te ayudará a no perderte en los senderos cambiantes del bosque.',
};

// Picking up one of the elf's tools.
export function collectElfoItem(id: string) {
  const { progress } = useProgressStore.getState();
  saveProgress({ collectedItems: [...progress.collectedItems, id] });
  const item = ELFO_COLLECTIBLES.find((candidate) => candidate.id === id);
  if (item) toast(`Guardaste en tu mochila: ${item.name}.`);
}

// Backpack of Challenge 2: replaces Challenge 1's once the elf's help is accepted.
export const DESAFIO2_BACKPACK: Backpack = {
  items: [
    { id: 'espada', name: 'Espada élfica', model: MODEL.espada, Icon: EspadaIcon, hotkey: '1' },
    { id: 'lente', name: 'Lente revelador', model: MODEL.lente, Icon: LenteIcon, hotkey: '2' },
    { id: 'mapa', name: 'Mapa del bosque', model: MODEL.mapa, Icon: MapaIcon, hotkey: '3' },
  ],
  isActive: isBackpackActive,
  stateOf: (id, progress) => getItemState(id as ElfoItemId, progress),
  hint: () => 'En la casa del elfo',
  goal: getGoal,
  use: (id) => {
    if (getItemState(id as ElfoItemId, useProgressStore.getState().progress) === 'owned') toast(PURPOSE[id as ElfoItemId]);
  },
};
