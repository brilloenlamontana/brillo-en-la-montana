import { useRegion, useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { ZUMBADOR_COUNT } from '../mission';
import { VISIBLE_FROM } from '../visibility';
import { Golem } from './Golem';
import { SprayEffect } from './SprayEffect';
import { Zumbador } from './Zumbador';

const ZUMBADORES = Array.from({ length: ZUMBADOR_COUNT }, (_, i) => i);


// The enemies of the swamp are mounted from the start, so that meeting them never stops the game to load them: far
// from the swamp (the village, Imeri's house, the forest...) they wait under the map doing nothing (no logic, no draw
// calls), and near it they are already out in the middle of the mud, the golem standing and the zumbadores hovering
// around it, until the player treads on the mud and they come for them. The defeated ones stay out of sight; the
// fallen golem stays on the ground until the player leaves the swamp.
export function PantanoEnemies() {
  const nearPantano = useVisibleFrom(VISIBLE_FROM.enemigos);
  const inPantano = useRegion() === 'pantano';
  const golemDefeated = useProgressStore((state) => state.progress.golemDefeated);

  return (
    <group name="PantanoEnemies">
      <Golem activo={nearPantano && (!golemDefeated || inPantano)} />
      {ZUMBADORES.map((i) => (
        <Zumbador key={i} index={i} activo={nearPantano} />
      ))}
      <SprayEffect />
    </group>
  );
}
