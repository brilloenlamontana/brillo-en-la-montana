import { playSfx } from '@/game/engine/audio/audio';
import { pickupNotice, type Backpack, type BackpackItem } from '@/game/challenges/types';
import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useBosqueStore } from './bosqueStore';
import { EspadaIcon, LenteIcon, MapaIcon } from './ItemIcons';
import { ELFO_COLLECTIBLES, SWORD_RANGE, type ElfoItemId } from './items';
import { DUENDE_COUNT, getGoal, getItemState, isBackpackActive, isMapaActivado } from './mission';
import { saveDesafio2Victory } from './victory';

const toast = (message: string) => useToastStore.getState().showToast(message);
const MODEL = Object.fromEntries(ELFO_COLLECTIBLES.map(({ id, url }) => [id, url])) as Record<ElfoItemId, string>;

// Activating the forest map lowers the hidden rock wall that blocks the mountain pass and lays a golden trail on the
// ground from the player to the forest exit (mapa/SenderoMapa).
function activarMapa() {
  const { progress } = useProgressStore.getState();
  if (isMapaActivado(progress)) {
    toast('El mapa ya reveló el sendero oculto: sigue las flechas doradas del suelo hasta la salida del bosque.');
    return;
  }
  useBosqueStore.getState().usarMapa();
  playSfx('d2_mapa');
  playSfx('d2_sendero_cambia', { volume: 0.8 });
  const victory = saveDesafio2Victory({ mapaActivado: true });
  if (!victory) {
    toast('¡Activaste el mapa del bosque! El muro de piedra desciende y un sendero dorado aparece en el suelo: síguelo hasta la salida.');
  }
}

// Looking through the lens, or putting it away (see frutos/).
function toggleLente() {
  const { lente, toggleLente } = useBosqueStore.getState();
  toggleLente();
  playSfx('d2_lente', { volume: 0.8 });
  toast(lente ? 'Guardas el lente revelador.' : 'Miras a través del lente revelador.');
}

// A sword swing (click or hotkey, like the insecticide): every live goblin within reach falls.
function swingSword() {
  useBosqueStore.getState().slash();
  playSfx('d2_espada_tajo');
  const player = usePlayerStore.getState().position;
  const { progress } = useProgressStore.getState();
  const hit = useBosqueStore
    .getState()
    .duendes.flatMap((duende, i) => (duende.active && duende.position.distanceTo(player) <= SWORD_RANGE ? [i] : []));
  if (!hit.length) {
    toast('Blandes la espada, pero no alcanza a nadie.');
    return;
  }
  playSfx('d2_espada_impacto');
  playSfx('d2_duende_muere', { volume: 0.8 });
  const defeated = [...new Set([...progress.duendesDefeated, ...hit])];
  const victory = saveDesafio2Victory({ duendesDefeated: defeated });
  const left = DUENDE_COUNT - defeated.length;
  if (!victory) {
    toast(
      left > 0
        ? `${hit.length > 1 ? `¡Derrotaste ${hit.length} duendes!` : '¡Derrotaste un duende!'} Quedan ${left}.`
        : '¡Acabaste con todos los duendes! La espada élfica cumplió su misión.',
    );
  }
}

const ITEMS: readonly BackpackItem[] = [
  {
    id: 'espada',
    name: 'Espada élfica',
    model: MODEL.espada,
    Icon: EspadaIcon,
    hotkey: '1',
    gesture: 'UseSlash',
    drawSound: 'd2_espada_desenvainar',
    purpose: 'Derrota a los duendes que tengas al alcance: úsala cuando se te acerquen.',
  },
  { id: 'lente', name: 'Lente revelador', model: MODEL.lente, Icon: LenteIcon, hotkey: '2', gesture: 'UseLens', purpose: 'Deja ver cuáles frutas del bosque se pueden comer y cuáles hacen daño.' },
  { id: 'mapa', name: 'Mapa del bosque', model: MODEL.mapa, Icon: MapaIcon, hotkey: '3', gesture: 'UseMap', purpose: 'Baja el muro de roca que cierra el bosque y marca en el suelo el camino hasta la salida.' },
];

// Picking up one of the elf's tools: the player is told what it is for.
export function collectElfoItem(id: string) {
  const { progress } = useProgressStore.getState();
  saveProgress({ collectedItems: [...progress.collectedItems, id] });
  const item = ITEMS.find((candidate) => candidate.id === id);
  if (item) toast(pickupNotice(item));
}

// Backpack of Challenge 2: replaces Challenge 1's once the elf's help is accepted.
export const DESAFIO2_BACKPACK: Backpack = {
  items: ITEMS,
  isActive: isBackpackActive,
  stateOf: (id, progress) => getItemState(id as ElfoItemId, progress),
  hint: (id, progress) => {
    const state = getItemState(id as ElfoItemId, progress);
    if (state === 'spent') return 'Ya lo usaste';
    return 'En la casa del elfo';
  },
  goal: getGoal,
  use: (id) => {
    const item = id as ElfoItemId;
    if (getItemState(item, useProgressStore.getState().progress) !== 'owned') return;
    if (item === 'espada') swingSword();
    else if (item === 'lente') toggleLente();
    else if (item === 'mapa') activarMapa();
  },
};
