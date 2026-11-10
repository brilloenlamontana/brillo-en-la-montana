import { useFrame } from '@react-three/fiber';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useUIStore } from '@/store/uiStore';
import { classifyInterior, classifyRegion } from './regions';
import { useZoneStore } from './zoneStore';

// Classifies the player's position every frame and writes the zone store only when the region or house changes.
// While the renderer warms up, Warmup drives the region instead; during a cinematic, the cinematic does.
export function ZoneTracker() {
  useFrame(() => {
    // A cinematic shows other parts of the map: it sets the zone itself.
    if (useWorldStore.getState().warming || useUIStore.getState().cinematic) return;
    const { x, y, z } = usePlayerStore.getState().position;
    const zone = useZoneStore.getState();
    const region = classifyRegion(x, y, z, zone.region);
    const interior = classifyInterior(x, y, z);
    if (region !== zone.region || interior !== zone.interior) zone.setZone(region, interior);
  });
  return null;
}
