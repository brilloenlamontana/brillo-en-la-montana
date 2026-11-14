import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';

// What stands in the way of whoever walks the Dark Forest by code instead of by physics (the goblins): every box of
// the trees' trunks and roots, as a circle on the ground with the heights it covers. BosqueOscuridad fills it from
// the same boxes the avatar collides with.
type Obstaculo = { x: number; z: number; radius: number; bottom: number; top: number };

// Circles by cell of CELL meters, so that a walker only checks the ones around it.
const CELL = 4;
const cells = new Map<string, Obstaculo[]>();
const key = (x: number, z: number) => `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;

export function setBosqueObstaculos(boxes: readonly ColliderBox[]) {
  cells.clear();
  for (const { position, args } of boxes) {
    const obstaculo = { x: position[0], z: position[2], radius: Math.hypot(args[0], args[2]) * 0.85, bottom: position[1] - args[1], top: position[1] + args[1] };
    const k = key(obstaculo.x, obstaculo.z);
    const list = cells.get(k);
    if (list) list.push(obstaculo);
    else cells.set(k, [obstaculo]);
  }
}

// Moves a walker of `radius` whose feet are at `point` out of whatever trunk or root it is inside of (in place, on the
// ground plane). Walking toward something behind a tree, it slides around it.
export function fueraDeLosArboles(point: { x: number; y: number; z: number }, radius: number) {
  const cx = Math.floor(point.x / CELL);
  const cz = Math.floor(point.z / CELL);
  for (let i = cx - 1; i <= cx + 1; i++) {
    for (let j = cz - 1; j <= cz + 1; j++) {
      const list = cells.get(`${i},${j}`);
      if (!list) continue;
      for (const { x, z, radius: r, bottom, top } of list) {
        // Only what is at the height of its body (not a branch over its head, not a root under its feet).
        if (bottom > point.y + 1 || top < point.y + 0.3) continue;
        const dx = point.x - x;
        const dz = point.z - z;
        const distance = Math.hypot(dx, dz);
        const reach = r + radius;
        if (distance >= reach) continue;
        if (distance < 1e-3) point.x += reach;
        else {
          point.x = x + (dx / distance) * reach;
          point.z = z + (dz / distance) * reach;
        }
      }
    }
  }
}
