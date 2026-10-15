import { allZumbadoresDefeated, areWellsSafe, hasMochilaItem } from '../constants/mission';
import type { MochilaItemId } from '../constants/recogibles';
import { saveProgress } from '../services/progressService';
import { useAvatarStore } from '../store/avatarStore';
import { useEnemyStore } from '../store/enemyStore';
import { useProgressStore, type GameProgress } from '../store/progressStore';
import { useToastStore } from '../store/toastStore';

export const GEMA_RANGE = 15; // la gema desactiva al golem si está a esta distancia
export const SPRAY_RANGE = 10; // el insecticida alcanza a los zumbadores dentro de este radio

// Guarda la derrota y, si con ella ya no quedan enemigos, marca la Misión 1 como completada.
function saveVictory(changes: Partial<GameProgress>) {
  const next = { ...useProgressStore.getState().progress, ...changes };
  if (areWellsSafe(next) && !next.mision1Completada) {
    changes.mision1Completada = true;
    changes.mision1CompletadaEn = new Date().toISOString();
  }
  saveProgress(changes);
  return changes.mision1Completada === true;
}

// Efecto de usar un objeto de la mochila; el resultado se informa con un aviso en pantalla.
export function activateMochilaItem(id: MochilaItemId) {
  const { showToast } = useToastStore.getState();
  const avatar = useAvatarStore.getState();
  const progress = useProgressStore.getState().progress;
  if (avatar.health <= 0 || !hasMochilaItem(id, progress)) return;
  const player = avatar.playerPosition;

  if (id === 'soga') {
    if (!avatar.trappedInWell) {
      showToast('La soga solo sirve para salir de un pozo.');
      return;
    }
    avatar.requestClimb();
    showToast('Usaste la soga y saliste del pozo.');
    return;
  }

  const enemies = useEnemyStore.getState();

  if (id === 'gema') {
    if (!enemies.golem.active) {
      showToast('No hay ningún Golem cerca.');
    } else if (enemies.golem.position.distanceTo(player) > GEMA_RANGE) {
      showToast('Acércate más al Golem para usar la gema.');
    } else {
      const completed = saveVictory({ golemDefeated: true });
      showToast(completed ? '¡El Golem se apagó y el pantano quedó libre! Misión 1 completada.' : 'La gema apagó la luz roja del pecho del Golem.');
    }
    return;
  }

  const defeated = progress.zumbadoresDefeated;
  const inRange = enemies.zumbadores
    .map((zumbador, index) => ({ zumbador, index }))
    .filter(({ zumbador, index }) => zumbador.active && !defeated.includes(index))
    .filter(({ zumbador }) => zumbador.position.distanceTo(player) <= SPRAY_RANGE)
    .map(({ index }) => index);
  enemies.spray();
  if (inRange.length === 0) {
    showToast('No hay zumbadores cerca para rociar.');
    return;
  }
  const zumbadoresDefeated = [...new Set([...defeated, ...inRange])];
  const completed = saveVictory({ zumbadoresDefeated });
  if (completed) {
    showToast('¡Acabaste con los zumbadores y el pantano quedó libre! Misión 1 completada.');
  } else if (allZumbadoresDefeated({ zumbadoresDefeated })) {
    showToast('¡Acabaste con todos los zumbadores! Ya no necesitas el insecticida.');
  } else {
    showToast(`El insecticida acabó con ${inRange.length} ${inRange.length === 1 ? 'zumbador' : 'zumbadores'}.`);
  }
}
