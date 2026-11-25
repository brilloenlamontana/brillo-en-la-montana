import { useFrame } from '@react-three/fiber';
import { distanceToPolygonEdge, isPointInPolygon } from '@/game/engine/geometry/polygon';
import { usePlayerStore } from '@/game/player/playerStore';
import { PANTANO_POLYGON } from '@/game/world/geography';
import { useZoneStore } from '@/game/world/zoneStore';
import { usePantanoStore } from '../pantanoStore';

// Leaving the mud, the player has to get this far from its edge before the enemies stop chasing.
const EXIT_MARGIN = 4;

// Whether the player treads on the swamp mud, and whether the golem and the zumbadores are after them: only while a
// living player is on the mud. Off it (or fallen and sent back to the last checkpoint) they let go and return to their
// place; they come again the next time the player treads on the mud. Written only when something changes.
export function MudTracker() {
  useFrame(() => {
    const pantano = usePantanoStore.getState();
    const player = usePlayerStore.getState();
    let onMud = false;
    if (useZoneStore.getState().region === 'pantano') {
      const { x, z } = player.position;
      onMud = isPointInPolygon(x, z, PANTANO_POLYGON) || (pantano.playerOnMud && distanceToPolygonEdge(x, z, PANTANO_POLYGON) < EXIT_MARGIN);
    }
    if (onMud !== pantano.playerOnMud) pantano.setPlayerOnMud(onMud);
    const alerted = onMud && player.health > 0;
    if (alerted !== pantano.alerted) pantano.setAlerted(alerted);
  });
  return null;
}
