import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '@/game/player/playerStore';
import { useZoneStore } from '@/game/world/zoneStore';
import { useProgressStore } from '@/store/progressStore';
import { useToastStore } from '@/store/toastStore';
import { MAX_HAMBRE, useBosqueStore } from '../bosqueStore';
import { isFed } from '../mission';

// Seconds in the forest to go from full to starving.
const HUNGER_SECONDS = 100;
// Out of the forest the player slowly gets back to full.
const RECOVER_PER_SECOND = 8;
// Health lost per second while starving.
const STARVING_DAMAGE_PER_SECOND = 2;
// Below this fullness the player is warned to look for fruit.
const HUNGRY_AT = 35;

const toast = (message: string) => useToastStore.getState().showToast(message);

// The forest's hunger: until the player has eaten enough good fruit, being in the Dark Forest empties the hunger bar
// and, once it is empty, costs health. It forces the player to eat its fruit, and only the lens tells which are safe.
// A defeat brings the player back full.
export function HambreDelBosque() {
  const warned = useRef({ hungry: false, starving: false });

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const player = usePlayerStore.getState();
    const { region, interior } = useZoneStore.getState();
    const bosque = useBosqueStore.getState();
    const active = region === 'bosque' && interior === null && !isFed(useProgressStore.getState().progress);

    let hambre = bosque.hambre;
    if (player.health <= 0) hambre = MAX_HAMBRE;
    else if (active) hambre = Math.max(0, hambre - (MAX_HAMBRE / HUNGER_SECONDS) * delta);
    else hambre = Math.min(MAX_HAMBRE, hambre + RECOVER_PER_SECOND * delta);

    if (active && player.health > 0) {
      if (hambre === 0) player.takeDamage(STARVING_DAMAGE_PER_SECOND * delta);
      if (hambre < HUNGRY_AT && !warned.current.hungry) {
        warned.current.hungry = true;
        toast('Tienes hambre. Los frutos del bosque se ven apetitosos, pero algunos están envenenados.');
      }
      if (hambre === 0 && !warned.current.starving) {
        warned.current.starving = true;
        toast('¡Te mueres de hambre! Come una fruta buena o seguirás perdiendo vida.');
      }
    }
    if (hambre >= HUNGRY_AT) warned.current = { hungry: false, starving: false };

    if (hambre !== bosque.hambre || active !== bosque.hambreActiva) bosque.setHambre(hambre, active);
  });

  return null;
}
