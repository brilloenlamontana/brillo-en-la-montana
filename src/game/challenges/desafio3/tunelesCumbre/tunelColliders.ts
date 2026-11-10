import { segmentBox, type ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { TUNEL_FLOOR_ROWS, TUNEL_PATCH_ROWS, TUNEL_WALL_ROWS } from './tunelColliderData';

// Cuboid colliders of the Summit tunnels (the maze of TunelesEstructura.glb). They are not written by hand: the export
// batch (tools/blender/export_lote.py) walks the real galleries with rays on a 0.4 m grid (floors, walls, the crevasse
// and its bridge, the cave-ins, the Ogre's platform and arm-wrestling table, the exit stairs) and writes
// tunelColliderData.ts: sloped floors along each gallery, flat patches where a floor does not follow its gallery
// (halls, steps) and walls along the real edge of what can be walked. Every measured cell has collision under it.

const FLOOR_HALF_THICKNESS = 0.15;
const WALL_HALF_THICKNESS = 0.2;
// Walls start a little under the floor and end out of reach of a jump.
const WALL_FOOT = 0.5;
const WALL_HEIGHT = 3.2;
const WALL_OVERLAP = 0.12;
// Camera-only ceilings: the floors again, lifted near the vault (the camera never rises into the rock).
const CEILING_BELOW_VAULT = 0.5;
const PATCH_CEILING = 4.6;

const FLOORS: ColliderBox[] = TUNEL_FLOOR_ROWS.map(([ax, ay, az, bx, by, bz, half], i) =>
  segmentBox(`tunel-piso-${i}`, [ax, ay, az], [bx, by, bz], half, FLOOR_HALF_THICKNESS, -FLOOR_HALF_THICKNESS),
);

const patchBox = (id: string, [x0, z0, x1, z1, y]: readonly number[], lift = 0): ColliderBox => ({
  id,
  position: [(x0 + x1) / 2, y - FLOOR_HALF_THICKNESS + lift, (z0 + z1) / 2],
  args: [(x1 - x0) / 2, FLOOR_HALF_THICKNESS, (z1 - z0) / 2],
});

const PATCHES: ColliderBox[] = TUNEL_PATCH_ROWS.map((row, i) => patchBox(`tunel-parche-${i}`, row));

// What can be walked is to the left of a→b: the wall stands on the other side, its inner face on the line.
const WALLS: ColliderBox[] = TUNEL_WALL_ROWS.map(([ax, az, bx, bz, yMin, yMax], i) => {
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  const ox = (-dz / length) * WALL_HALF_THICKNESS, oz = (dx / length) * WALL_HALF_THICKNESS;
  const bottom = yMin - WALL_FOOT, top = yMax + WALL_HEIGHT;
  const y = (bottom + top) / 2;
  return segmentBox(`tunel-muro-${i}`, [ax + ox, y, az + oz], [bx + ox, y, bz + oz], WALL_HALF_THICKNESS, (top - bottom) / 2, 0, WALL_OVERLAP);
});

const CEILINGS: ColliderBox[] = [
  ...TUNEL_FLOOR_ROWS.map(([ax, ay, az, bx, by, bz, half, clear], i) => {
    const lift = clear - CEILING_BELOW_VAULT;
    return segmentBox(`tunel-techo-${i}`, [ax, ay + lift, az], [bx, by + lift, bz], half, FLOOR_HALF_THICKNESS, FLOOR_HALF_THICKNESS);
  }),
  ...TUNEL_PATCH_ROWS.map((row, i) => patchBox(`tunel-techo-parche-${i}`, row, PATCH_CEILING)),
];

// Every box the avatar collides with in the tunnels.
export const TUNEL_COLLIDERS: readonly ColliderBox[] = [...FLOORS, ...PATCHES, ...WALLS];
// The walls and the ceilings keep the third-person camera inside the galleries.
export const TUNEL_CAMERA_BLOCKERS: readonly ColliderBox[] = [...WALLS, ...CEILINGS];
