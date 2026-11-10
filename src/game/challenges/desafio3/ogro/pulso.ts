import { playSfx } from '@/game/engine/audio/audio';
import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { useUIStore } from '@/store/uiStore';
import { DIALOG } from '../dialogs';
import { MESA_PULSO, OGRO_HALL_Y, OGRO_REPEL_POINT } from '../lugares';
import { hasCollected, isOgroVencido } from '../mission';
import { useTunelStore } from '../tunelStore';

const toast = (message: string) => useToastStore.getState().showToast(message);

// The Ogre can be challenged from this far from his table (m).
export const RETO_RANGE = 3.2;
// What it costs to be thrown back by him.
const REPEL_DAMAGE = 20;
// The Ogre first walks from the stairs to his table (OGRO_WALK_MS), then the arm wrestling lasts PULSO_MS.
export const OGRO_WALK_MS = 1700;
export const PULSO_MS = 3200;

// Whether the player stands by the arm-wrestling table, in the Ogre's hall.
export function isAtMesaPulso() {
  const { x, y, z } = usePlayerStore.getState().position;
  return y > OGRO_HALL_Y[0] && y < OGRO_HALL_Y[1] && Math.hypot(x - MESA_PULSO[0], z - MESA_PULSO[2]) < RETO_RANGE;
}

// The Ogre grabs the player and throws them back into the hall: it hurts (and can be a defeat).
export function repelPlayer(message: string) {
  const player = usePlayerStore.getState();
  if (player.health <= 0) return;
  useTunelStore.getState().repelerOgro();
  playSfx('d3_ogro_grunido');
  playSfx('d3_ogro_lanza');
  player.takeDamage(REPEL_DAMAGE);
  if (usePlayerStore.getState().health > 0) player.requestTeleport(OGRO_REPEL_POINT);
  toast(message);
}

// Challenging the Ogre at his table (E by the table, or using the glove there). Without the miner's glove he wins
// and throws the player back; with it the arm wrestling starts and is won (the Ogro component ends it).
export function retarAlOgro() {
  const { progress } = useProgressStore.getState();
  const tunel = useTunelStore.getState();
  if (isOgroVencido(progress)) return toast('El ogro ya te dejó pasar: sube la escalera de piedra hacia la cumbre.');
  if (tunel.pulsoAt !== null) return;
  if (!isAtMesaPulso()) return toast('El guante de minero es para el pulso con el ogro: acércate a su mesa, al final de los túneles.');
  if (!hasCollected('guante', progress)) {
    return repelPlayer('Sin el guante de minero el ogro te dobla el brazo de un tirón y te lanza por los aires. Necesitas el guante de Hedrig.');
  }
  tunel.setPulso(performance.now());
  playSfx('d3_pulso');
  toast('¡Te pones el guante de minero y aceptas el pulso! El ogro deja la escalera, se planta frente a ti y empuja con todas sus fuerzas…');
}

// The arm wrestling is won: the Ogre steps aside for good.
export function vencerOgro() {
  useTunelStore.getState().celebrarOgro();
  playSfx('d3_pulso_gana');
  playSfx('d3_ogro_risa', { volume: 0.8 });
  saveProgress({ ogroVencido: true });
  useUIStore.getState().openDialog(DIALOG.ogroVencido);
}
