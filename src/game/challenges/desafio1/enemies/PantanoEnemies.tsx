import { useState } from 'react';
import { useRegion, useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { ZUMBADOR_COUNT } from '../mission';
import { VISIBLE_FROM } from '../visibility';
import { Golem } from './Golem';
import { SprayEffect } from './SprayEffect';
import { Zumbador } from './Zumbador';

// Zumbadores still alive when the swarm mounts. Those that die now finish their fall and are left out the next time
// the swarm mounts (when the player comes back to the swamp).
function ZumbadorSwarm() {
  const [alive] = useState(() => {
    const defeated = useProgressStore.getState().progress.zumbadoresDefeated;
    return Array.from({ length: ZUMBADOR_COUNT }, (_, i) => i).filter((i) => !defeated.includes(i));
  });
  return alive.map((i) => <Zumbador key={i} index={i} />);
}

// The enemies hide in the swamp wells and only come out while the player treads on the mud. Far from the swamp (the
// village, Imeri's house, the forest...) they are unmounted: no logic, no draw calls, no physics bodies. Once
// defeated they are not mounted again; the fallen golem stays on the ground until the player leaves the swamp.
export function PantanoEnemies() {
  const nearPantano = useVisibleFrom(VISIBLE_FROM.enemigos);
  const inPantano = useRegion() === 'pantano';
  const golemDefeated = useProgressStore((state) => state.progress.golemDefeated);

  return (
    <group name="PantanoEnemies">
      {nearPantano && (!golemDefeated || inPantano) && <Golem />}
      {nearPantano && <ZumbadorSwarm />}
      <SprayEffect />
    </group>
  );
}
