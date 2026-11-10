import { segmentBox, type ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { TUNEL_WALL_ROWS } from './tunelColliderData';

// Collision of the Summit tunnels (the maze of TunelesEstructura.glb). It is not written by hand: the export batch
// (tools/blender/export_lote.py) walks the real galleries with rays on a 0.4 m grid (floors, walls, the crevasse and
// its bridge, the cave-ins, the Ogre's platform and arm-wrestling table, the exit stairs) and writes two things:
// - the floor, one continuous mesh (TunelSueloColision in TunelesColision.glb) whose slopes and steps are smooth ramps,
//   used as a trimesh like the terrain, so the avatar never trips on a seam;
// - the walls, as cuboids along the real edge of what can be walked (tunelColliderData.ts).

const WALL_HALF_THICKNESS = 0.2;
// Walls start a little under the floor and end out of reach of a jump.
const WALL_FOOT = 0.5;
const WALL_HEIGHT = 3.4;
const WALL_OVERLAP = 0.12;

// Name of the floor mesh in TunelesColision.glb, and how far above it the camera-only ceiling hangs.
export const TUNEL_FLOOR_NODE = 'TunelSueloColision';
export const TUNEL_CEILING_HEIGHT = 4.4;

// What can be walked is to the left of a→b: the wall stands on the other side, its inner face on the line.
export const TUNEL_WALLS: readonly ColliderBox[] = TUNEL_WALL_ROWS.map(([ax, az, bx, bz, yMin, yMax], i) => {
  const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
  const ox = (-dz / length) * WALL_HALF_THICKNESS, oz = (dx / length) * WALL_HALF_THICKNESS;
  const bottom = yMin - WALL_FOOT, top = yMax + WALL_HEIGHT;
  const y = (bottom + top) / 2;
  return segmentBox(`tunel-muro-${i}`, [ax + ox, y, az + oz], [bx + ox, y, bz + oz], WALL_HALF_THICKNESS, (top - bottom) / 2, 0, WALL_OVERLAP);
});
