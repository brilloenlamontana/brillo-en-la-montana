import { orientedBox, segmentBox, wallBox, type ColliderBox, type Point3 } from '@/game/engine/physics/colliderBoxes';

// Minimal cuboid colliders for Hedrig's house: only where the avatar walks or bumps into something. The house is
// turned 21.25° on the map, so its shell (plinth, walls, door ramp, ceiling) is described in the house's own frame and
// placed with HOUSE_POSITION / HOUSE_ROTATION; the furniture and what stands outside are boxes fitted to each object in
// world coordinates. Measured on HedrigExterior.glb and HedrigInterior.glb (minimum-area rectangles of each mesh).

// House frame: origin at the center of the house (world x, z), local +x along the house's short side (the door is on
// the -x wall) and local +z along its long side.
export const HOUSE_POSITION: [number, number, number] = [90, 0, -212];
export const HOUSE_YAW_DEG = 21.25;
export const HOUSE_ROTATION: [number, number, number] = [0, (HOUSE_YAW_DEG * Math.PI) / 180, 0];

const FLOOR_Y = 24.37; // top of the stone plinth = interior floor
const WALL_TOP = 28.5; // well over a jump; the roof is out of reach
const CEILING_Y = 27.62; // top of HedrigMurosInterior
// Half-extents of the walls: outer and inner faces of HedrigParedes / HedrigMurosInterior.
const OUTER = { x: 3.84, z: 4.54 } as const;
const INNER = { x: 3.33, z: 4.03 } as const;
// Clear opening of the door in the -x wall (between the jambs of HedrigPuertaMarco; the hinge is at z -1.455).
const DOOR_Z: [number, number] = [-1.47, -0.53];
const DOOR_CENTER_Z = (DOOR_Z[0] + DOOR_Z[1]) / 2;
const DOOR_TOP = FLOOR_Y + 2.15;
// The plinth sticks out 0.8 m in front of the door wall; the ground there is ~0.6 m lower.
const PLINTH = { x: [-4.65, 4.05], z: [-4.75, 4.75] } as const;
const GROUND_AT_DOOR = 23.7;

// Axis-aligned box between two corners (in the frame it is used in).
function box(id: string, [x0, y0, z0]: Point3, [x1, y1, z1]: Point3): ColliderBox {
  return { id, position: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], args: [Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2, Math.abs(z1 - z0) / 2] };
}

// The four walls in the house frame; the -x one leaves the door open (the leaf is a PhysicsDoor) under its lintel.
const WALLS: ColliderBox[] = [
  box('hedrig-muro-fondo', [INNER.x, FLOOR_Y, -OUTER.z], [OUTER.x, WALL_TOP, OUTER.z]),
  box('hedrig-muro-lado-a', [-OUTER.x, FLOOR_Y, INNER.z], [OUTER.x, WALL_TOP, OUTER.z]),
  box('hedrig-muro-lado-b', [-OUTER.x, FLOOR_Y, -OUTER.z], [OUTER.x, WALL_TOP, -INNER.z]),
  box('hedrig-muro-puerta-a', [-OUTER.x, FLOOR_Y, -OUTER.z], [-INNER.x, WALL_TOP, DOOR_Z[0]]),
  box('hedrig-muro-puerta-b', [-OUTER.x, FLOOR_Y, DOOR_Z[1]], [-INNER.x, WALL_TOP, OUTER.z]),
  box('hedrig-dintel', [-OUTER.x, DOOR_TOP, DOOR_Z[0]], [-INNER.x, WALL_TOP, DOOR_Z[1]]),
];

// Shell of the house, in the house frame (see HOUSE_POSITION / HOUSE_ROTATION).
export const HEDRIG_HOUSE_COLLIDERS: readonly ColliderBox[] = [
  // Stone plinth (its top is the floor) and a ramp up its edge in front of the door.
  box('hedrig-base', [PLINTH.x[0], 23.67, PLINTH.z[0]], [PLINTH.x[1], FLOOR_Y, PLINTH.z[1]]),
  segmentBox('hedrig-rampa', [PLINTH.x[0] - 1.7, GROUND_AT_DOOR, DOOR_CENTER_Z], [PLINTH.x[0] + 0.1, FLOOR_Y, DOOR_CENTER_Z], 0.9, 0.15, -0.15, 0.1),
  ...WALLS,
];

// The walls and the ceiling keep the third-person camera from crossing the house (house frame).
export const HEDRIG_CAMERA_BLOCKERS: readonly ColliderBox[] = [
  ...WALLS,
  box('hedrig-cielo', [-OUTER.x, CEILING_Y, -OUTER.z], [OUTER.x, CEILING_Y + 0.3, OUTER.z]),
];

// Furniture and what stands around the house, in world coordinates (yaw of each box's long side in degrees).
export const HEDRIG_PROP_COLLIDERS: readonly ColliderBox[] = [
  // Inside: the fireplace, the table and the low shelf.
  orientedBox('hedrig-chimenea', [92.85, 26.07, -210.15], [1.4, 1.7, 1.27], 69.1),
  orientedBox('hedrig-mesa', [88.15, 24.92, -212.89], [0.84, 0.56, 0.84], 53.2),
  orientedBox('hedrig-repisa', [88.47, 24.85, -214.97], [1.67, 0.47, 0.83], -16),
  // Outside: barrels by the door, the table, the woodpile, the campfire, the lamp post and the fence (a straight line
  // of seven sections down the slope).
  orientedBox('hedrig-barril-1', [84.56, 24.4, -212.62], [0.38, 0.5, 0.38], 0),
  orientedBox('hedrig-barril-2', [84.48, 24.4, -213.5], [0.38, 0.5, 0.38], 0),
  orientedBox('hedrig-mesa-exterior', [85.42, 24.8, -206.68], [0.8, 0.92, 0.49], 59.4),
  orientedBox('hedrig-lena', [92.46, 24.5, -207.32], [1.12, 0.6, 0.5], -21.3),
  orientedBox('hedrig-fogata', [83.45, 24.8, -208.6], [1.09, 1.4, 1.11], 82),
  orientedBox('hedrig-farol', [79.79, 24.8, -213.42], [0.48, 1.85, 0.11], 68.7),
  wallBox('hedrig-cerca', [77.9, -214.8], [91.8, -219.9], 22.6, 25.2, 0.1),
];
