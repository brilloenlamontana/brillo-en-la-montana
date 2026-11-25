import { isPointInPolygon } from '@/game/engine/geometry/polygon';
import { PANTANO_POLYGON } from '@/game/world/geography';
import type { Well } from '../pantanoTristeza/wells';

// Where the enemies of the swamp wait: out in the open, in the middle of the mud, from before the player gets there
// (they no longer come out of a well under the player's nose). The golem stands at the middle and the zumbadores
// hover around it.

// Where the golem waits (world x, z): the middle of the swamp, halfway between the way in from Imeri's house and the
// way out to the valley, on a clearing among the wells (the nearest one is almost 9 m away). Whoever comes in has to go
// deep into the mud before meeting it.
const MIDDLE = { x: 26, z: -47.5 };
// The golem keeps this far from the rim of any well (m).
const CLEAR = 3;

// The enemies of the swamp never leave it: a step from (x, z) by (dx, dz) that would take one out of the mud is cut
// down to the part of it that stays inside (along x, along z, or nothing), so it slides along the shore instead of
// walking through the hills around the swamp. Returns the step to take.
export function pasoEnElPantano(x: number, z: number, dx: number, dz: number): [number, number] {
  if (isPointInPolygon(x + dx, z + dz, PANTANO_POLYGON)) return [dx, dz];
  // Already outside (it should not happen): any step is allowed, so it can come back in.
  if (!isPointInPolygon(x, z, PANTANO_POLYGON)) return [dx, dz];
  if (isPointInPolygon(x + dx, z, PANTANO_POLYGON)) return [dx, 0];
  if (isPointInPolygon(x, z + dz, PANTANO_POLYGON)) return [0, dz];
  return [0, 0];
}

let found: { wells: readonly Well[]; x: number; z: number } | null = null;

// The golem's place: the middle of the mud, moved aside if a well happens to be there.
export function guaridaDelPantano(wells: readonly Well[]): { x: number; z: number } {
  if (found?.wells === wells) return found;
  let { x, z } = MIDDLE;
  for (let tries = 0; tries < 12 && wells.some((well) => Math.hypot(well.x - x, well.z - z) < well.outerRadius + CLEAR); tries++) x += 2;
  found = { wells, x, z };
  return found;
}

// Where each zumbador hovers while it waits: on a ring around the golem, each at its own distance and height (m over
// the ground).
export function puestoDelZumbador(index: number, count: number, wells: readonly Well[]) {
  const { x, z } = guaridaDelPantano(wells);
  const angle = (index / count) * Math.PI * 2;
  const radius = 5 + (index % 3) * 1.6;
  return { x: x + Math.cos(angle) * radius, z: z + Math.sin(angle) * radius, height: 2 + (index % 3) * 0.45 };
}
