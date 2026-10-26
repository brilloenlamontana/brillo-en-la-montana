import { usePlayerStore } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { MAX_HAMBRE, useBosqueStore } from '../bosqueStore';
import { FRUTOS_NEEDED, frutosEaten, isDesafio2Completado, isFrutoBueno } from '../mission';
import { saveDesafio2Victory } from '../victory';

const toast = (message: string) => useToastStore.getState().showToast(message);

// Health a good fruit gives back.
const GOOD_FRUIT_HEALTH = 20;

// Damage dealt by a poisonous fruit: takes 5 bad fruits to deplete 100 health (20 * 5 = 100).
const BAD_FRUIT_DAMAGE = 20;

// Eating the forest fruit at this index. A good one fills the player up, heals a little and counts for the challenge;
// a poisonous one damages health (defeating the player after eating 5 bad fruits). Returns whether it was good.
// Once Challenge 2 is completed, eating fruits is permanently deactivated.
export function comerFruto(index: number): boolean {
  const { progress } = useProgressStore.getState();
  if (isDesafio2Completado(progress)) {
    toast('Ya superaste el Bosque de la Oscuridad: no necesitas comer más frutos.');
    return false;
  }

  const player = usePlayerStore.getState();
  if (!isFrutoBueno(index)) {
    const lethal = player.health <= BAD_FRUIT_DAMAGE;
    toast(
      lethal
        ? '¡Esa fruta estaba envenenada! El veneno consumió tus últimas fuerzas.'
        : `¡Esa fruta estaba envenenada! Perdiste vida (-${BAD_FRUIT_DAMAGE}). Usa el lente revelador para ver cuáles son buenas.`,
    );
    player.takeDamage(BAD_FRUIT_DAMAGE);
    return false;
  }

  const frutosComidos = progress.frutosComidos.includes(index) ? progress.frutosComidos : [...progress.frutosComidos, index];
  const victory = saveDesafio2Victory({ frutosComidos });
  const bosque = useBosqueStore.getState();
  bosque.setHambre(MAX_HAMBRE, bosque.hambreActiva);
  player.heal(GOOD_FRUIT_HEALTH);

  if (!victory) {
    const left = FRUTOS_NEEDED - frutosEaten({ frutosComidos });
    toast(
      left > 0
        ? `¡Deliciosa! Recuperas fuerzas. ${left === 1 ? 'Te falta una fruta buena más' : `Te faltan ${left} frutas buenas`} para saciar tu hambre.`
        : left === 0
          ? '¡Deliciosa! Saciaste tu hambre: ya puedes recorrer el bosque sin preocuparte por comer.'
          : '¡Deliciosa! Recuperas fuerzas.',
    );
  }
  return true;
}
