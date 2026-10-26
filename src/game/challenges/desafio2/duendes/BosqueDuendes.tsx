import { useState } from 'react';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { DUENDE_COUNT } from '../mission';
import { VISIBLE_FROM } from '../visibility';
import { Duende } from './Duende';
import { SwordSlash } from './SwordSlash';

// Where each goblin waits, spread over the Dark Forest on flat ground (measured on Terreno.glb).
const HOMES: readonly (readonly [number, number])[] = [
  [-80, -225],
  [-50, -195],
  [-30, -235],
  [8, -226],
  [20, -195],
  [40, -205],
];

// Goblins still alive when the pack mounts; those that fall now finish their fall and are left out next time.
function Pack() {
  const [alive] = useState(() => {
    const defeated = useProgressStore.getState().progress.duendesDefeated;
    return Array.from({ length: DUENDE_COUNT }, (_, i) => i).filter((i) => !defeated.includes(i));
  });
  return alive.map((i) => <Duende key={i} index={i} home={HOMES[i]} />);
}

// The goblins of the Dark Forest. They only exist in the forest and its valley: anywhere else they are unmounted (no
// logic, no draw calls, no bodies). The pack remounts each time the player comes back, so after a story restart
// every goblin is there again.
export function BosqueDuendes() {
  const near = useVisibleFrom(VISIBLE_FROM.duendes);
  return (
    <group name="BosqueDuendes">
      {near && <Pack />}
      <SwordSlash />
    </group>
  );
}
