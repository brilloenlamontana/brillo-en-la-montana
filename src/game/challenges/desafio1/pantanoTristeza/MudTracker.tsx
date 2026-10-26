import { useFrame } from '@react-three/fiber';
import { distanceToPolygonEdge, isPointInPolygon } from '@/game/engine/geometry/polygon';
import { usePlayerStore } from '@/game/player/playerStore';
import { PANTANO_POLYGON } from '@/game/world/geography';
import { useZoneStore } from '@/game/world/zoneStore';
import { usePantanoStore } from '../pantanoStore';

// Leaving the mud, the player has to get this far from its edge before the enemies stop chasing.
const EXIT_MARGIN = 4;

// Whether the player treads on the swamp mud, which wakes the golem and the zumbadores. Only computed inside the
// swamp region (that region already spans the shore), and written only when it changes.
export function MudTracker() {
  useFrame(() => {
    const pantano = usePantanoStore.getState();
    let onMud = false;
    if (useZoneStore.getState().region === 'pantano') {
      const { x, z } = usePlayerStore.getState().position;
      onMud = isPointInPolygon(x, z, PANTANO_POLYGON) || (pantano.playerOnMud && distanceToPolygonEdge(x, z, PANTANO_POLYGON) < EXIT_MARGIN);
    }
    if (onMud !== pantano.playerOnMud) pantano.setPlayerOnMud(onMud);
  });
  return null;
}
