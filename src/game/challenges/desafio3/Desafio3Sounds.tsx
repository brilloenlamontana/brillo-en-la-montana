import { usePlayerStore } from '@/game/player/playerStore';
import { useCombat } from '@/game/sound/combatStore';
import { useLoopNear } from '@/game/engine/audio/useLoopNear';
import { useSfxNow } from '@/game/sound/useSfxNow';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { useTunelStore } from './tunelStore';

// Hedrig's campfire, with her cauldron over it (see casaDeHedrig/hedrigColliders: 'hedrig-fogata').
const FOGATA = { x: 83.45, y: 24.4, z: -208.6 };
const fogata = () => FOGATA;

const espectro = () => {
  const { espectro: ghost } = useTunelStore.getState();
  return ghost.active && !useProgressStore.getState().progress.espectroCalmado ? ghost.position : null;
};

// Rockslides rumble far up the mountain: heard all around the player in the mining town at its foot.
const rockslide = () => (useZoneStore.getState().region === 'pueblo' ? usePlayerStore.getState().position : null);

// The blue trail of the compass hums around the player while it shows the way through the tunnels.
const guide = () =>
  useTunelStore.getState().brujulaActiva && useZoneStore.getState().region === 'tuneles' ? usePlayerStore.getState().position : null;

const ESPECTRO_FIGHT_RANGE = 16;
const espectroFight = () => {
  const ghost = espectro();
  return ghost !== null && ghost.distanceTo(usePlayerStore.getState().position) < ESPECTRO_FIGHT_RANGE;
};

// Sounds of the mining town and the tunnels heard from a distance: the campfire and its cauldron, the rockslides on
// the mountain, the hum of the compass trail and the weeping of the ghost girl until she gets her doll back. While
// she chases the player the combat theme plays.
export function Desafio3Sounds() {
  useLoopNear('obj_fogata', fogata, 14, 0.9);
  useLoopNear('obj_caldero', fogata, 6, 0.5);
  useLoopNear('d3_espectro_llanto', espectro, 26, 0.9);
  useLoopNear('d3_guia_azul', guide, 4, 0.3);
  useSfxNow('d3_derrumbe', rockslide, 10, [25, 55], 0.45);
  useCombat('espectro', espectroFight);
  return null;
}
