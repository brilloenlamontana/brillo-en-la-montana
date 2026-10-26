import { Euler, Quaternion, Vector3 } from 'three';

export type Point2 = readonly [number, number];
export type Point3 = readonly [number, number, number];

// One cuboid: `args` are half-extents, exactly like Rapier's CuboidCollider. Also used for camera-only blockers.
export type ColliderBox = {
  id: string;
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
};

const UP = new Vector3(0, 1, 0);
const FORWARD_Z = new Vector3(0, 0, 1);

const toEuler = (quaternion: Quaternion) => new Euler().setFromQuaternion(quaternion).toArray().slice(0, 3) as [number, number, number];

// Box whose long side runs from `a` to `b` (may slope, like a ramp). halfWidth is across the segment and halfThickness
// is along its local up. `raise` shifts the box along its local up: -halfThickness puts the top face on the a–b line
// (floors and ramps), +halfThickness puts the bottom face there (railings). `overlap` lengthens both ends so
// consecutive segments of a curved path leave no gaps.
export function segmentBox(id: string, a: Point3, b: Point3, halfWidth: number, halfThickness: number, raise = 0, overlap = 0): ColliderBox {
  const start = new Vector3(...a);
  const direction = new Vector3(...b).sub(start);
  const horizontal = Math.hypot(direction.x, direction.z);
  // rotation.y = yaw turns local +x toward (cos yaw, -sin yaw) in XZ; the pitch around local z then tilts it upward.
  const yaw = new Quaternion().setFromAxisAngle(UP, Math.atan2(-direction.z, direction.x));
  const pitch = new Quaternion().setFromAxisAngle(FORWARD_Z, Math.atan2(direction.y, horizontal));
  const rotation = yaw.multiply(pitch);
  const center = start.addScaledVector(direction, 0.5).addScaledVector(UP.clone().applyQuaternion(rotation), raise);
  return {
    id,
    position: center.toArray() as [number, number, number],
    args: [direction.length() / 2 + overlap, halfThickness, halfWidth],
    rotation: toEuler(rotation),
  };
}

// Vertical wall from `a` to `b` (XZ), between yBottom and yTop.
export function wallBox(id: string, a: Point2, b: Point2, yBottom: number, yTop: number, halfThickness: number): ColliderBox {
  const y = (yBottom + yTop) / 2;
  return segmentBox(id, [a[0], y, a[1]], [b[0], y, b[1]], halfThickness, (yTop - yBottom) / 2);
}

// Box centered on `center`, turned `yawDeg` degrees in the XZ plane so its local x points along (cos yaw, sin yaw).
export function orientedBox(id: string, center: Point3, halfExtents: Point3, yawDeg: number): ColliderBox {
  return { id, position: [...center], args: [...halfExtents], rotation: [0, -(yawDeg * Math.PI) / 180, 0] };
}

// Ring of boxes tangent to a circle (palisades, well walls): `segments` boxes spanning the arc from `fromAngle` to
// `toAngle` (radians, from +x toward +z). Each box's inner face sits at `innerRadius`, one value for the whole ring or
// one per segment for irregular rings.
export function ringBoxes(
  id: string,
  center: Point2,
  innerRadius: number | readonly number[],
  thickness: number,
  yBottom: number,
  yTop: number,
  { segments, fromAngle = 0, toAngle = 2 * Math.PI }: { segments: number; fromAngle?: number; toAngle?: number },
): ColliderBox[] {
  const step = (toAngle - fromAngle) / segments;
  return Array.from({ length: segments }, (_, i) => {
    const radius = typeof innerRadius === 'number' ? innerRadius : innerRadius[i];
    const radial = radius + thickness / 2;
    const angle = fromAngle + (i + 0.5) * step;
    return {
      id: `${id}-${i}`,
      position: [center[0] + radial * Math.cos(angle), (yBottom + yTop) / 2, center[1] + radial * Math.sin(angle)],
      args: [thickness / 2, (yTop - yBottom) / 2, (radius + thickness) * Math.tan(step / 2) + 0.05],
      rotation: [0, -angle, 0],
    };
  });
}

// Unit vector at `deg` degrees in the XZ plane (measured from +x toward +z).
export const directionXZ = (deg: number): Point2 => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
