import { playSfx } from '@/game/engine/audio/audio';
import type { Backpack } from '@/game/challenges/types';
import { usePlayerStore } from '@/game/player/playerStore';
import { useZoneStore } from '@/game/world/zoneStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { entregarMuneca, quienRecibeMuneca } from './espectro/muneca';
import { BrujulaIcon, GuanteIcon, MunecaIcon } from './ItemIcons';
import { HEDRIG_COLLECTIBLES, type HedrigItemId } from './items';
import { getGoal, getItemState, isBackpackActive, isHedrigHouseUnlocked } from './mission';
import { retarAlOgro } from './ogro/pulso';
import { useTunelStore } from './tunelStore';

const toast = (message: string) => useToastStore.getState().showToast(message);
const MODEL = Object.fromEntries(HEDRIG_COLLECTIBLES.map(({ id, url }) => [id, url])) as Record<HedrigItemId, string>;

// Taking the compass out, or putting it away: inside the tunnels it lays a glowing trail toward the summit exit
// (brujula/BrujulaGuia).
function toggleBrujula() {
  const { brujulaActiva, toggleBrujula: toggle } = useTunelStore.getState();
  toggle();
  if (brujulaActiva) return toast('Guardas la brújula.');
  playSfx('d3_brujula');
  toast(
    useZoneStore.getState().region === 'tuneles'
      ? 'La aguja de la brújula tiembla y un sendero de luz azul marca el camino hacia la salida de la cumbre.'
      : 'Sacas la brújula: dentro de los túneles su luz te marcará el camino correcto en cada cruce.',
  );
}

const EFFECTS: Record<HedrigItemId, () => void> = { guante: retarAlOgro, brujula: toggleBrujula, muneca: entregarMuneca };

// Picking up one of Hedrig's items.
export function collectHedrigItem(id: string) {
  const { progress } = useProgressStore.getState();
  saveProgress({ collectedItems: [...progress.collectedItems, id] });
  const item = HEDRIG_COLLECTIBLES.find((candidate) => candidate.id === id);
  if (item) toast(`Guardaste en tu mochila: ${item.name}.`);
}

// Backpack of Challenge 3: replaces the elf's once the player arrives at Hedrig's mining town.
export const DESAFIO3_BACKPACK: Backpack = {
  items: [
    { id: 'guante', name: 'Guante de minero', model: MODEL.guante, Icon: GuanteIcon, hotkey: '1', gesture: 'UseGlove' },
    { id: 'brujula', name: 'Brújula', model: MODEL.brujula, Icon: BrujulaIcon, hotkey: '2', gesture: 'UseCompass' },
    { id: 'muneca', name: 'Muñeca de trapo', model: MODEL.muneca, Icon: MunecaIcon, hotkey: '3', gesture: 'UseOffer', aim: quienRecibeMuneca },
  ],
  isActive: isBackpackActive,
  stateOf: (id, progress) => getItemState(id as HedrigItemId, progress),
  hint: (id, progress) => {
    if (getItemState(id as HedrigItemId, progress) === 'spent') return 'Ya cumplió su propósito';
    return isHedrigHouseUnlocked(progress) ? 'En la casa de Hedrig' : 'Pide ayuda a Hedrig';
  },
  goal: getGoal,
  use: (id) => {
    const item = id as HedrigItemId;
    if (usePlayerStore.getState().health <= 0 || getItemState(item, useProgressStore.getState().progress) !== 'owned') return;
    EFFECTS[item]();
  },
};
