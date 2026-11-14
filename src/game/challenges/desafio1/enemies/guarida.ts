import type { Well } from '../pantanoTristeza/wells';

// Where the enemies of the swamp wait: out in the open, in the middle of the mud, from before the player gets there
// (they no longer come out of a well under the player's nose). The golem stands at the middle and the zumbadores
// hover around it.

// Middle of the mud (world x, z), away from the way in from Imeri's house and from the way out to the valley.
const MIDDLE = { x: 58, z: -4 };
// The golem keeps this far from the rim of any well (m).
const CLEAR = 3;

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
