import { useEffect } from 'react';
import { create } from 'zustand';
import { useWorldStore } from '@/game/engine/rendering/worldStore';

// Which fights are under way (the golem, the goblins, the ghost girl…): while there is one, the combat theme plays
// instead of the music of the place (see soundscape.ts). Each challenge reports its own with useCombat.
interface CombatState {
  fights: readonly string[];
  setFight: (fight: string, on: boolean) => void;
}

export const useCombatStore = create<CombatState>((set, get) => ({
  fights: [],
  setFight: (fight, on) => {
    const { fights } = get();
    if (fights.includes(fight) === on) return;
    set({ fights: on ? [...fights, fight] : fights.filter((other) => other !== fight) });
  },
}));

const CHECK_MS = 500;
// The theme holds a little after the enemy is gone or beaten, so it does not come and go while the player dodges.
const HOLD_MS = 4000;

// Reports a fight while `fighting()` is true. It must be a stable function (declared outside the component): it is
// read twice per second.
export function useCombat(fight: string, fighting: () => boolean) {
  useEffect(() => {
    let last = -Infinity;
    const interval = setInterval(() => {
      const now = performance.now();
      if (useWorldStore.getState().ready && fighting()) last = now;
      useCombatStore.getState().setFight(fight, now - last < HOLD_MS);
    }, CHECK_MS);
    return () => {
      clearInterval(interval);
      useCombatStore.getState().setFight(fight, false);
    };
  }, [fight, fighting]);
}
