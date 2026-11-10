import type { Polygon2D } from '@/game/engine/geometry/polygon';
import type { Zone } from '@/game/engine/geometry/zone';
import type { Interior } from './regions';
import { TUNEL_EDGES } from './tunelesRed';

// Shapes of the map regions (world XZ, measured on Map.blend), used to know where the player is (see regions.ts).
// glTF (x, y, z) = Blender (x, z, -y).

type Point3 = readonly [number, number, number];

// --- Challenge 1 ---
// Villa Boj: the circle of its palisade.
export const VILLA_BOJ_ZONE: Zone = { center: [-86.93, 14.89], enterRadius: 32, exitRadius: 34 };

// Clearing of Imeri's house: reaching it counts as being "at the house".
export const CASA_IMERI_ZONE: Zone = { center: [18, 42], enterRadius: 26, exitRadius: 29 };

// Outline of the Swamp of Sadness mud, measured on the terrain mask.
export const PANTANO_POLYGON: Polygon2D = [
  [70.3, 38.9], [94.3, 38.9], [98.3, 30.9], [114.3, 30.9], [114.3, 34.9], [134.3, 30.9], [134.3, 22.9], [138.3, 22.9],
  [138.3, 10.9], [134.3, 10.9], [134.3, -1.1], [130.3, -1.1], [134.3, -33.1], [98.3, -33.1], [98.3, -37.1], [90.3, -37.1],
  [82.3, -45.1], [82.3, -53.1], [54.3, -53.1], [54.3, -57.1], [34.3, -61.1], [34.3, -65.1], [14.3, -65.1], [-5.8, -85.1],
  [-9.8, -97.1], [-37.8, -97.1], [-37.8, -93.1], [-69.8, -97.1], [-73.8, -85.1], [-77.8, -85.1], [-73.8, -49.1],
  [-65.8, -49.1], [-65.8, -45.1], [-33.8, -45.1], [-21.8, -33.1], [-21.8, -25.1], [10.3, -25.1], [30.3, -5.1],
  [46.3, -5.1], [50.3, -9.1], [58.3, -1.1], [58.3, 26.9],
];

// The swamp region also takes in the shore around the mud, up to the valley walls.
export const PANTANO_REGION_MARGIN = { enter: 18, exit: 21 } as const;

// --- Challenge 2 ---
// Valley at the forest entrance, with the elf's house: from the northern tip of the swamp to the forest pass.
export const VALLE_POLYGON: Polygon2D = [
  [-94.3, -98.6], [-87.2, -123.7], [-74.4, -149.4], [-70.6, -155.2], [-63.6, -162.9], [-46.8, -178.5], [-40.7, -196.8],
  [-15.3, -191.2], [-17.2, -173.5], [-4.4, -153.1], [-5.4, -124.8], [-21.6, -106.6], [-40.8, -92.3], [-55.7, -77.4],
];

// Dark Forest: a basin closed by mountains, entered by the valley pass and left by Hedrig's pass.
export const BOSQUE_POLYGON: Polygon2D = [
  [-118, -175], [-100, -166], [-70, -170], [-48, -176], [-20, -172], [10, -170], [38, -176], [55, -184], [66, -196],
  [70, -216], [66, -238], [50, -254], [25, -260], [-10, -262], [-45, -262], [-80, -258], [-105, -248], [-120, -226],
  [-124, -200],
];

// --- Challenge 3 ---
// Hedrig's mining town, at the forest exit and the foot of the Summit of Desolation.
export const PUEBLO_HEDRIG_ZONE: Zone = { center: [92.6, -203.2], enterRadius: 30, exitRadius: 33 };

// Summit tunnels: a maze of galleries (network in tunelesRed.ts, generated from Map.blend). The player is in them
// when within this horizontal distance of a gallery axis and between its floor and its ceiling: the galleries run
// under the town and under the summit, so height decides.
export const TUNEL_RADIUS = { enter: 8, exit: 9.5 } as const;
// Feet this far under a gallery floor still count (steps, rubble).
export const TUNEL_FLOOR_MARGIN = 2;
// Floor polyline and clear height of every gallery.
export const TUNEL_PATHS: readonly { floor: readonly Point3[]; clear: number }[] = TUNEL_EDGES.map(({ floor, clear }) => ({ floor, clear }));

// --- Closing story ---
// Summit plateau (ellipse in XZ, ground at ~52 m): only reachable through the tunnels. Above minY the player is out of
// the exit pit (whose stairs climb from 47.4 to 51.75) and over the Ogre's hall (floor at 42.5), so it wins over the
// tunnels that run right under it.
export const CUMBRE_REGION = { center: [129, -155], radiusX: 46, radiusZ: 32, minY: 50.8 } as const;

// --- House interiors ---
// World-space box of each interior, measured from the floors and walls of each GLB: crossing the door is being inside.
// A house turned on the map gives its box in its own frame: `pivot` is the house center (world x, z) and `yawDeg` its
// turn (the same as its colliders' rotation.y).
export type InteriorBox = { min: Point3; max: Point3; pivot?: readonly [number, number]; yawDeg?: number };

export const INTERIOR_BOXES: Record<Interior, InteriorBox> = {
  imeri: { min: [16.4, 10.3, 41.3], max: [23.7, 14, 49.1] },
  elfo: { min: [-40.1, 21.4, -140.2], max: [-34.4, 25, -134.5] },
  hedrig: { min: [-3.33, 24, -4.03], max: [3.33, 28, 4.03], pivot: [90, -212], yawDeg: 21.25 },
  santuario: { min: [153.1, 52, -156.98], max: [164.9, 65, -149.02] },
};
