import { useFrame } from '@react-three/fiber';
import { distanceToPolygonEdge, isPointInPolygon } from '@/game/engine/geometry/polygon';
import { usePlayerStore } from '@/game/player/playerStore';
import { PANTANO_POLYGON } from '@/game/world/geography';
import { useZoneStore } from '@/game/world/zoneStore';
import { usePantanoStore } from '../pantanoStore';

// Leaving the mud, the player has to get this far from its edge before they count as off it.
const EXIT_MARGIN = 4;
// The enemies lose track of a player who gets this far from the mud (m): they turn back to their place.
const LOSE_DISTANCE = 90;

// Whether the player treads on the swamp mud, and whether the golem and the zumbadores are after them. Treading on the
// mud alerts them, and from then on they chase the player wherever they go, out of the swamp too; they only give up
// when the player falls or runs very far from the mud. Written only when something changes.
export function MudTracker() {
  useFrame(() => {
    const pantano = usePantanoStore.getState();
    const player = usePlayerStore.getState();
    const { x, z } = player.position;
    let onMud = false;
    if (useZoneStore.getState().region === 'pantano') {
      onMud = isPointInPolygon(x, z, PANTANO_POLYGON) || (pantano.playerOnMud && distanceToPolygonEdge(x, z, PANTANO_POLYGON) < EXIT_MARGIN);
    }
    if (onMud !== pantano.playerOnMud) pantano.setPlayerOnMud(onMud);

    let alerted = pantano.alerted;
    if (player.health <= 0) alerted = false;
    else if (onMud) alerted = true;
    else if (alerted && distanceToPolygonEdge(x, z, PANTANO_POLYGON) > LOSE_DISTANCE) alerted = false;
    if (alerted !== pantano.alerted) pantano.setAlerted(alerted);
  });
  return null;
}
