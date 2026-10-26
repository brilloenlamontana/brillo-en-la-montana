// Circle in world XZ. exitRadius > enterRadius gives hysteresis, so nothing flickers when the player stands on the border.
export type Zone = { center: readonly [number, number]; enterRadius: number; exitRadius: number };

export const isInZone = ({ center, enterRadius, exitRadius }: Zone, x: number, z: number, wasInside: boolean) =>
  Math.hypot(x - center[0], z - center[1]) < (wasInside ? exitRadius : enterRadius);
