import { Vector3 } from 'three';

// A door leaf seen from above: a slab running from the hinge to its free edge.
export type LeafShape = {
  // Hinge at the leaf's mid height.
  hinge: Vector3;
  // Horizontal unit vector from the hinge toward the free edge.
  along: Vector3;
  // Horizontal reach from the hinge to the farthest point of the leaf.
  length: number;
  // Box around the leaf: center, half-extents (along, height, thickness) and yaw for a Y rotation.
  center: Vector3;
  half: [number, number, number];
  yaw: number;
  bottom: number;
  top: number;
};

const MIN_HALF_THICKNESS = 0.05;

// Measures a closed leaf from its world-space vertices. Its direction is the principal axis of the vertices in XZ:
// leaves are not always aligned with their node's axes (the elf's door is modeled diagonal), and a box aligned with
// those axes would be far thicker than the leaf and sweep the doorway when it swings.
export function measureLeaf(points: readonly Vector3[], pivot: Vector3): LeafShape {
  let meanX = 0, meanZ = 0;
  for (const p of points) {
    meanX += p.x;
    meanZ += p.z;
  }
  meanX /= points.length;
  meanZ /= points.length;
  let xx = 0, zz = 0, xz = 0;
  for (const p of points) {
    const dx = p.x - meanX, dz = p.z - meanZ;
    xx += dx * dx;
    zz += dz * dz;
    xz += dx * dz;
  }
  const theta = 0.5 * Math.atan2(2 * xz, xx - zz);
  const along = new Vector3(Math.cos(theta), 0, Math.sin(theta));
  const across = new Vector3(-along.z, 0, along.x);

  let uMin = Infinity, uMax = -Infinity, vMin = Infinity, vMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const p of points) {
    const u = p.x * along.x + p.z * along.z;
    const v = p.x * across.x + p.z * across.z;
    uMin = Math.min(uMin, u); uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v); vMax = Math.max(vMax, v);
    yMin = Math.min(yMin, p.y); yMax = Math.max(yMax, p.y);
  }
  const u = (uMin + uMax) / 2, v = (vMin + vMax) / 2;
  const center = new Vector3(along.x * u + across.x * v, (yMin + yMax) / 2, along.z * u + across.z * v);
  const hinge = pivot.clone().setY(center.y);
  if ((center.x - hinge.x) * along.x + (center.z - hinge.z) * along.z < 0) along.negate();

  let length = 0;
  for (const p of points) length = Math.max(length, Math.hypot(p.x - hinge.x, p.z - hinge.z));

  return {
    hinge,
    along,
    length,
    center,
    half: [(uMax - uMin) / 2, (yMax - yMin) / 2, Math.max((vMax - vMin) / 2, MIN_HALF_THICKNESS)],
    // three's Y rotation turns local +x toward (cos yaw, -sin yaw): local x runs along the leaf.
    yaw: Math.atan2(-along.z, along.x),
    bottom: yMin,
    top: yMax,
  };
}
