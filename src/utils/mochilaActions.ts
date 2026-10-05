import type { MochilaItemId } from '../constants/recogibles';
import { useAvatarStore } from '../store/avatarStore';
import { useEnemyStore } from '../store/enemyStore';
import { useToastStore } from '../store/toastStore';

export const GEMA_RANGE = 15; // la gema desactiva al golem si está a esta distancia
export const SPRAY_RANGE = 10; // el insecticida alcanza a los zumbadores dentro de este radio

// Efecto de usar un objeto de la mochila; el resultado se informa con un aviso en pantalla.
export function activateMochilaItem(id: MochilaItemId) {
  const { showToast } = useToastStore.getState();
  const avatar = useAvatarStore.getState();
  if (avatar.health <= 0) return;
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
    if (enemies.golemDefeated) {
      showToast('El Golem ya está desactivado.');
    } else if (!enemies.golem.active) {
      showToast('No hay ningún Golem cerca.');
    } else if (enemies.golem.position.distanceTo(player) > GEMA_RANGE) {
      showToast('Acércate más al Golem para usar la gema.');
    } else {
      enemies.defeatGolem();
      showToast('La gema apagó la luz roja del pecho del Golem.');
    }
    return;
  }

  const inRange = enemies.zumbadores
    .map((zumbador, index) => ({ zumbador, index }))
    .filter(({ zumbador, index }) => zumbador.active && !enemies.deadZumbadores.includes(index))
    .filter(({ zumbador }) => zumbador.position.distanceTo(player) <= SPRAY_RANGE)
    .map(({ index }) => index);
  if (inRange.length === 0) {
    showToast('No hay zumbadores cerca para rociar.');
    return;
  }
  enemies.killZumbadores(inRange);
  showToast(`El insecticida acabó con ${inRange.length} ${inRange.length === 1 ? 'zumbador' : 'zumbadores'}.`);
}
