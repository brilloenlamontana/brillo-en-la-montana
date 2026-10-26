import { orientedBox, segmentBox, wallBox, type ColliderBox, type Point3 } from '@/game/engine/physics/colliderBoxes';

// Minimal cuboid colliders for Hedrig's house: only where the avatar walks or bumps into something. Measured from
// HedrigExterior.glb and HedrigInterior.glb (world coordinates, y up); props as boxes fitted to their shape.

const FLOOR_Y = 24.37; // top of the stone plinth = interior floor
const GROUND_AT_DOOR = 23.88;
const WALL_TOP = 28.5; // well over a jump; the roof is out of reach
// Walls: outer and inner faces of HedrigParedes / HedrigMurosInterior.
const OUTER = { x: [84.8, 95.2], z: [-217.6, -206.4] } as const;
const INNER = { x: [85.5, 94.5], z: [-216.9, -207.1] } as const;
// Clear opening of the door in the west wall (between the jambs of HedrigPuertaMarco).
const DOOR_Z: [number, number] = [-212.05, -211.1];
const DOOR_CENTER_Z = (DOOR_Z[0] + DOOR_Z[1]) / 2;

// Axis-aligned box between two corners.
function box(id: string, [x0, y0, z0]: Point3, [x1, y1, z1]: Point3): ColliderBox {
  return { id, position: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], args: [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2] };
}

// The four walls; the west one leaves the door open. The door leaf has no collision yet (it is part of the model).
const WALLS: ColliderBox[] = [
  box('hedrig-muro-norte', [OUTER.x[0], FLOOR_Y, INNER.z[1]], [OUTER.x[1], WALL_TOP, OUTER.z[1]]),
  box('hedrig-muro-sur', [OUTER.x[0], FLOOR_Y, OUTER.z[0]], [OUTER.x[1], WALL_TOP, INNER.z[0]]),
  box('hedrig-muro-este', [INNER.x[1], FLOOR_Y, OUTER.z[0]], [OUTER.x[1], WALL_TOP, OUTER.z[1]]),
  box('hedrig-muro-oeste-sur', [OUTER.x[0], FLOOR_Y, OUTER.z[0]], [INNER.x[0], WALL_TOP, DOOR_Z[0]]),
  box('hedrig-muro-oeste-norte', [OUTER.x[0], FLOOR_Y, DOOR_Z[1]], [INNER.x[0], WALL_TOP, OUTER.z[1]]),
];

export const HEDRIG_COLLIDERS: readonly ColliderBox[] = [
  // Stone plinth (its top is the floor) and a ramp up its 0.5 m edge in front of the door.
  box('hedrig-base', [84.5, 23.67, -217.89], [95.5, FLOOR_Y, -206.1]),
  segmentBox('hedrig-rampa', [83.2, GROUND_AT_DOOR, DOOR_CENTER_Z], [84.55, FLOOR_Y, DOOR_CENTER_Z], 0.7, 0.15, -0.15, 0.1),
  ...WALLS,
  // Inside: the fireplace, the table and the low shelf against the south wall.
  orientedBox('hedrig-chimenea', [92.85, 26.07, -210.15], [1.4, 1.7, 1.27], 69.1),
  orientedBox('hedrig-mesa', [88.15, 24.92, -212.89], [0.84, 0.56, 0.84], 53.2),
  orientedBox('hedrig-repisa', [88.47, 24.85, -214.97], [1.67, 0.47, 0.83], -16),
  // Outside: barrels by the door, the table, the woodpile, the campfire, the lamp post and the fence (a straight line
  // of seven sections down the slope).
  orientedBox('hedrig-barril-1', [84.56, 24.52, -212.62], [0.38, 0.45, 0.38], 0),
  orientedBox('hedrig-barril-2', [84.48, 24.51, -213.5], [0.38, 0.45, 0.38], 0),
  orientedBox('hedrig-mesa-exterior', [85.42, 24.94, -206.68], [0.8, 0.78, 0.49], 59.4),
  orientedBox('hedrig-lena', [92.46, 24.66, -207.32], [1.12, 0.66, 0.5], -21.3),
  orientedBox('hedrig-fogata', [83.45, 25.14, -208.6], [1.09, 1.08, 1.11], 82),
  orientedBox('hedrig-farol', [79.79, 25.19, -213.42], [0.48, 1.45, 0.11], 68.7),
  wallBox('hedrig-cerca', [77.9, -214.8], [91.8, -219.9], 23.3, 25.1, 0.1),
];

// The outer walls also keep the third-person camera out of them.
export const HEDRIG_CAMERA_BLOCKERS: readonly ColliderBox[] = WALLS;
