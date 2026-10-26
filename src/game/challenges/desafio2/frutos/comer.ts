import { usePlayerStore } from '@/game/player/playerStore';
import { saveProgress } from '@/services/progressService';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { MAX_HAMBRE, useBosqueStore } from '../bosqueStore';
import { FRUTOS_NEEDED, frutosEaten, isFrutoBueno } from '../mission';

const toast = (message: string) => useToastStore.getState().showToast(message);

// Health a good fruit gives back.
const GOOD_FRUIT_HEALTH = 20;

// Eating the forest fruit at this index. A good one fills the player up, heals a little and counts for the challenge;
// a poisonous one is deadly (a "bajo"). Returns whether it was good.
export function comerFruto(index: number): boolean {
  const player = usePlayerStore.getState();
  if (!isFrutoBueno(index)) {
    toast('¡Esa fruta estaba envenenada! Sin el lente revelador no podías saberlo.');
    player.takeDamage(player.health);
    return false;
  }

  const { progress } = useProgressStore.getState();
  const frutosComidos = progress.frutosComidos.includes(index) ? progress.frutosComidos : [...progress.frutosComidos, index];
  saveProgress({ frutosComidos });
  const bosque = useBosqueStore.getState();
  bosque.setHambre(MAX_HAMBRE, bosque.hambreActiva);
  player.heal(GOOD_FRUIT_HEALTH);

  const left = FRUTOS_NEEDED - frutosEaten({ frutosComidos });
  toast(
    left > 0
      ? `¡Deliciosa! Recuperas fuerzas. ${left === 1 ? 'Te falta una fruta buena más' : `Te faltan ${left} frutas buenas`} para saciar tu hambre.`
      : left === 0
        ? '¡Deliciosa! Saciaste tu hambre: ya puedes recorrer el bosque sin preocuparte por comer.'
        : '¡Deliciosa! Recuperas fuerzas.',
  );
  return true;
}
