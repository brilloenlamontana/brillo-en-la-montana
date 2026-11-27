import { playSfx } from '@/game/engine/audio/audio';
import { pickupNotice, type Backpack, type BackpackItem } from '@/game/challenges/types';
import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore, type GameProgress } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';
import { DESAFIO1_MODELS } from './assets';
import { DIALOG } from './dialogs';
import { GemaIcon, InsecticidaIcon, SogaIcon } from './ItemIcons';
import { GEMA_RANGE, POTION_IDS, SPRAY_RANGE, type BackpackItemId } from './items';
import { allZumbadoresDefeated, areWellsSafe, countPociones, getGoal, getItemState, hasItem, isBackpackActive } from './mission';
import { usePantanoStore } from './pantanoStore';

const DIR = DESAFIO1_MODELS.casaDeImeri.recogibles;
const toast = (message: string) => useToastStore.getState().showToast(message);

// Saves an enemy defeat. With no enemy left Challenge 1 is completed and the "swamp crossed" dialog opens. Returns whether it was completed now.
function saveVictory(changes: Partial<GameProgress>): boolean {
  const next = { ...useProgressStore.getState().progress, ...changes };
  const completedNow = areWellsSafe(next) && !next.mision1Completada;
  if (completedNow) {
    changes.mision1Completada = true;
    changes.mision1CompletadaEn = new Date().toISOString();
    usePlayerStore.getState().restoreHealth();
  }
  saveProgress(changes);
  if (completedNow) useUIStore.getState().openDialog(DIALOG.pantanoSuperado);
  return completedNow;
}

function applySoga() {
  const pantano = usePantanoStore.getState();
  if (!pantano.trappedInWell) return toast('Sacas la soga, pero aquí no pasa nada.');
  pantano.requestClimb();
  playSfx('d1_soga');
  toast('Usaste la soga y saliste del pozo.');
}

function applyGema() {
  const { golem } = usePantanoStore.getState();
  if (!golem.active) return toast('Alzas la gema, pero aquí no pasa nada.');
  if (golem.position.distanceTo(usePlayerStore.getState().position) > GEMA_RANGE) return toast('Alzas la gema, pero desde aquí no pasa nada.');
  playSfx('d1_golem_apagado');
  if (!saveVictory({ golemDefeated: true })) toast('La gema apagó la luz azul del pecho del Golem.');
}

function applyInsecticida() {
  const pantano = usePantanoStore.getState();
  const player = usePlayerStore.getState().position;
  const defeated = useProgressStore.getState().progress.zumbadoresDefeated;
  const inRange = pantano.zumbadores.flatMap((zumbador, index) =>
    zumbador.active && !defeated.includes(index) && zumbador.position.distanceTo(player) <= SPRAY_RANGE ? [index] : [],
  );
  pantano.spray();
  playSfx('d1_spray');
  if (inRange.length === 0) return toast('Rocías el insecticida, pero aquí no pasa nada.');
  playSfx('d1_zumbon_huye');
  const zumbadoresDefeated = [...new Set([...defeated, ...inRange])];
  if (saveVictory({ zumbadoresDefeated })) return;
  if (allZumbadoresDefeated({ zumbadoresDefeated })) toast('¡Acabaste con todos los zumbadores! Ya no necesitas el insecticida.');
  else toast(`El insecticida acabó con ${inRange.length} ${inRange.length === 1 ? 'zumbador' : 'zumbadores'}.`);
}

const EFFECTS: Record<BackpackItemId, () => void> = { gema: applyGema, soga: applySoga, insecticida: applyInsecticida };

const ITEMS: readonly BackpackItem[] = [
  { id: 'gema', name: 'Gema', model: `${DIR}/Gema.glb`, Icon: GemaIcon, hotkey: '1', gesture: 'UseThrow', purpose: 'Apaga la luz azul del pecho del Golem: úsala cuando lo tengas cerca.' },
  { id: 'soga', name: 'Soga', model: `${DIR}/Soga.glb`, Icon: SogaIcon, hotkey: '2', gesture: 'UseRope', purpose: 'Te saca de un pozo de lodo: úsala en cuanto empieces a hundirte.' },
  {
    id: 'insecticida',
    name: 'Insecticida',
    model: `${DIR}/Insecticida.glb`,
    Icon: InsecticidaIcon,
    hotkey: '3',
    gesture: 'UseSpray',
    purpose: 'Acaba con los zumbadores que tengas cerca. Se prepara al recoger las 5 pociones.',
  },
];

// Picking up an item in Imeri's house: the player is told what it is for. The fifth potion completes the insecticide.
export function collectImeriItem(id: string) {
  const { progress } = useProgressStore.getState();
  const hadInsecticida = hasItem('insecticida', progress);
  saveProgress({ collectedItems: [...progress.collectedItems, id] });
  const item = ITEMS.find((candidate) => candidate.id === id);
  if (item) return toast(pickupNotice(item));
  const pociones = countPociones(useProgressStore.getState().progress);
  if (!hadInsecticida && pociones === POTION_IDS.length) {
    toast(`🧪 Con las 5 pociones preparaste el insecticida. ${pickupNotice(ITEMS[2])}`);
  } else if (pociones < POTION_IDS.length) {
    toast(`Poción ${pociones} de ${POTION_IDS.length}: con las ${POTION_IDS.length} se prepara el insecticida contra los zumbadores.`);
  }
}

// Backpack of Challenge 1: active since Imeri's help was accepted.
export const DESAFIO1_BACKPACK: Backpack = {
  items: ITEMS,
  isActive: isBackpackActive,
  stateOf: (id, progress) => getItemState(id as BackpackItemId, progress),
  hint: (id, progress) => {
    if (getItemState(id as BackpackItemId, progress) === 'spent') return 'Ya lo usaste';
    return id === 'insecticida' ? `Pociones ${countPociones(progress)}/${POTION_IDS.length} · casa de Imeri` : 'En la casa de Imeri';
  },
  goal: getGoal,
  use: (id) => {
    const progress = useProgressStore.getState().progress;
    if (usePlayerStore.getState().health <= 0 || !hasItem(id as BackpackItemId, progress)) return;
    EFFECTS[id as BackpackItemId]();
  },
};
