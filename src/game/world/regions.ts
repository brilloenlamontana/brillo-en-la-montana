import { distanceToPolygonEdge, isPointInPolygon } from '@/game/engine/geometry/polygon';
import { isInZone } from '@/game/engine/geometry/zone';
import {
  BOSQUE_POLYGON,
  CASA_IMERI_ZONE,
  CUMBRE_REGION,
  INTERIOR_BOXES,
  PANTANO_POLYGON,
  PANTANO_REGION_MARGIN,
  PUEBLO_HEDRIG_ZONE,
  TUNEL_FLOOR_MARGIN,
  TUNEL_PATHS,
  TUNEL_RADIUS,
  VALLE_POLYGON,
  VILLA_BOJ_ZONE,
} from './geography';

// Part of the map the player is in; it decides what is drawn (see each challenge's visibility.ts).
// Challenge 1: villa, camino, casa (Imeri), pantano. Challenge 2: valle (elf's house), bosque.
// Challenge 3: pueblo (Hedrig), tuneles. Closing story: cumbre.
export type Region = 'villa' | 'camino' | 'casa' | 'pantano' | 'valle' | 'bosque' | 'pueblo' | 'tuneles' | 'cumbre';

// House the player is inside: indoors only the house and what shows through its doors and windows is drawn.
export type Interior = 'imeri' | 'elfo' | 'hedrig' | 'santuario';

// Every region, along the story.
export const REGIONS: readonly Region[] = ['villa', 'camino', 'casa', 'pantano', 'valle', 'bosque', 'pueblo', 'tuneles', 'cumbre'];

// Regions that border each other (walking from one leads straight into the other).
const NEIGHBORS: Record<Region, readonly Region[]> = {
  villa: ['camino'],
  camino: ['villa', 'casa', 'pantano'],
  casa: ['camino', 'pantano'],
  pantano: ['camino', 'casa', 'valle'],
  valle: ['pantano', 'bosque'],
  bosque: ['valle', 'pueblo'],
  pueblo: ['bosque', 'tuneles'],
  tuneles: ['pueblo', 'cumbre'],
  cumbre: ['tuneles'],
};

// Regions the renderer warmup visits while loading: every one of them, so that walking into a new part of the map
// never stops the game to get it ready. The farthest from where the player appears go first and that one last (the
// last one visited is what shows first).
export function warmupRegions(start: Region): Region[] {
  const order: Region[] = [start];
  for (let i = 0; i < order.length; i++) {
    for (const neighbor of NEIGHBORS[order[i]]) if (!order.includes(neighbor)) order.push(neighbor);
  }
  for (const region of REGIONS) if (!order.includes(region)) order.push(region);
  return order.reverse();
}

// Horizontal distance to the nearest gallery the point is in (between its floor and its ceiling); Infinity when it is
// above or below every gallery, like the town or the summit over them.
function distanceToTunnel(x: number, y: number, z: number): number {
  let best = Infinity;
  for (const { floor, clear } of TUNEL_PATHS) {
    for (let i = 1; i < floor.length; i++) {
      const [ax, ay, az] = floor[i - 1];
      const [bx, by, bz] = floor[i];
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
      const height = y - (ay + t * (by - ay));
      if (height < -TUNEL_FLOOR_MARGIN || height > clear) continue;
      best = Math.min(best, Math.hypot(x - (ax + t * dx), z - (az + t * dz)));
    }
  }
  return best;
}

const inCumbre = (x: number, y: number, z: number) => {
  const { center, radiusX, radiusZ, minY } = CUMBRE_REGION;
  return y > minY && ((x - center[0]) / radiusX) ** 2 + ((z - center[1]) / radiusZ) ** 2 < 1;
};

// Checked in priority order: the tunnels pass under other regions (the summit, over them, goes first), and the swamp shore overlaps the house clearing
// and the valley, so it goes last. `previous` adds hysteresis: leaving a region takes a few meters more than entering.
export function classifyRegion(x: number, y: number, z: number, previous: Region): Region {
  // The summit lies right over the last galleries: out of the exit pit it wins.
  if (inCumbre(x, y, z)) return 'cumbre';
  if (distanceToTunnel(x, y, z) < (previous === 'tuneles' ? TUNEL_RADIUS.exit : TUNEL_RADIUS.enter)) return 'tuneles';
  if (isInZone(VILLA_BOJ_ZONE, x, z, previous === 'villa')) return 'villa';
  if (isInZone(CASA_IMERI_ZONE, x, z, previous === 'casa')) return 'casa';
  if (isInZone(PUEBLO_HEDRIG_ZONE, x, z, previous === 'pueblo')) return 'pueblo';
  if (isPointInPolygon(x, z, BOSQUE_POLYGON)) return 'bosque';
  if (isPointInPolygon(x, z, VALLE_POLYGON)) return 'valle';
  const margin = previous === 'pantano' ? PANTANO_REGION_MARGIN.exit : PANTANO_REGION_MARGIN.enter;
  if (isPointInPolygon(x, z, PANTANO_POLYGON) || distanceToPolygonEdge(x, z, PANTANO_POLYGON) < margin) return 'pantano';
  return 'camino';
}

const INTERIORS = (Object.entries(INTERIOR_BOXES) as [Interior, (typeof INTERIOR_BOXES)[Interior]][]).map(([interior, box]) => {
  const yaw = ((box.yawDeg ?? 0) * Math.PI) / 180;
  return { interior, min: box.min, max: box.max, pivot: box.pivot ?? [0, 0], cos: Math.cos(yaw), sin: Math.sin(yaw) };
});

export function classifyInterior(x: number, y: number, z: number): Interior | null {
  for (const { interior, min, max, pivot, cos, sin } of INTERIORS) {
    // Into the house frame (a rotation.y of `yaw` turns local +x toward (cos, -sin) in XZ).
    const dx = x - pivot[0], dz = z - pivot[1];
    const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
    if (lx > min[0] && lx < max[0] && y > min[1] && y < max[1] && lz > min[2] && lz < max[2]) return interior;
  }
  return null;
}
