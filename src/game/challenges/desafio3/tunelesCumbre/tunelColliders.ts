import { segmentBox, type ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { TUNEL_BLOCK_ROWS, TUNEL_PATCH_HALF_THICKNESS, TUNEL_PATCH_ROWS, TUNEL_WALL_ROWS } from './tunelColliderData';

// Collision of the Summit tunnels (the maze of TunelesEstructura.glb). Only the floor is modelled: one continuous mesh
// (TunelSueloColision in TunelesColision.glb) covering exactly what can be walked, with slopes and steps as smooth
// ramps, used as a trimesh like the terrain so the avatar never trips on a seam. Everything else is derived from the
// outline of that mesh by scripts/tuneles-fisica.mjs (npm run tuneles:fisica), which writes tunelColliderData.ts:
// - walls along every edge of the floor, so the galleries are closed by construction (no wall only where the floor
//   comes out to the terrain: the mine mouth and the exit pit);
// - one upright box for each small thing standing in the middle of a gallery;
// - a strip of floor over each slit nothing stands in (between the planks of the bridge).
// After changing the tunnels in Map.blend: export the floor mesh and run the script; never edit the boxes by hand.

const WALL_HALF_THICKNESS = 0.2;
const WALL_OVERLAP = 0.12;
const PATCH_OVERLAP = 0.05;

// Name of the floor mesh in TunelesColision.glb, and how far above it the camera-only ceiling hangs.
export const TUNEL_FLOOR_NODE = 'TunelSueloColision';
export const TUNEL_CEILING_HEIGHT = 4.4;

export const TUNEL_BOXES: readonly ColliderBox[] = [
  // The floor is to the left of a→b: the wall stands on the other side, its inner face on the line.
  ...TUNEL_WALL_ROWS.map(([ax, az, bx, bz, bottom, top], i) => {
    const dx = bx - ax, dz = bz - az, length = Math.hypot(dx, dz) || 1;
    const ox = (-dz / length) * WALL_HALF_THICKNESS, oz = (dx / length) * WALL_HALF_THICKNESS;
    const y = (bottom + top) / 2;
    return segmentBox(`tunel-muro-${i}`, [ax + ox, y, az + oz], [bx + ox, y, bz + oz], WALL_HALF_THICKNESS, (top - bottom) / 2, 0, WALL_OVERLAP);
  }),
  ...TUNEL_BLOCK_ROWS.map(([x, z, halfX, halfZ, bottom, top], i): ColliderBox => ({
    id: `tunel-bloque-${i}`,
    position: [x, (bottom + top) / 2, z],
    args: [halfX, (top - bottom) / 2, halfZ],
  })),
  // Top face on the line from one lip of the slit to the other.
  ...TUNEL_PATCH_ROWS.map(([ax, ay, az, bx, by, bz, halfWidth], i) =>
    segmentBox(`tunel-parche-${i}`, [ax, ay, az], [bx, by, bz], halfWidth, TUNEL_PATCH_HALF_THICKNESS, -TUNEL_PATCH_HALF_THICKNESS, PATCH_OVERLAP),
  ),
];
