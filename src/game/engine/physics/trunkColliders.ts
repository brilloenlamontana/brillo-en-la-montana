import { Euler, Quaternion, Vector3, type BufferGeometry, type Material, type Mesh, type Object3D } from 'three';
import type { ColliderBox } from './colliderBoxes';

// A box of a tree model in its geometry's local space: center and half-extents.
export type TrunkCore = { center: Vector3; half: Vector3 };

// The whole bounding box of the bark mesh: right for straight trunks without spreading roots (pines).
export function boundingBoxCore(geometry: BufferGeometry): TrunkCore {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return { center: box.getCenter(new Vector3()), half: box.getSize(new Vector3()).multiplyScalar(0.5) };
}

// The foliage of a conifer as one box, from the ground to its tip: as wide as its lowest boughs (the widest, measured
// in the `band` meters above the lowest leaf) times `fit` — a square inside their circle — so the avatar does not walk
// through the leaves. `ground` is how far below the lowest leaf the ground is.
export function foliageBox(geometry: BufferGeometry, { band = 1.8, fit = 0.75, ground = 1.9 } = {}): TrunkCore {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const position = geometry.attributes.position;
  let radius = 0;
  for (let i = 0; i < position.count; i++) {
    if (position.getY(i) - box.min.y < band) radius = Math.max(radius, Math.hypot(position.getX(i), position.getZ(i)));
  }
  const bottom = box.min.y - ground;
  return { center: new Vector3(0, (bottom + box.max.y) / 2, 0), half: new Vector3(radius * fit, (box.max.y - bottom) / 2, radius * fit) };
}

type LowBark = {
  // Side of the cells the bark is measured in (m).
  cell?: number;
  // Height of the ground in the model (its roots go below it).
  ground?: number;
  // Bark lower than this above the ground is stepped over (thin roots lying on the earth): it gets no box.
  stepOver?: number;
  // Bark higher than this is over every head (branches): it gets no box.
  head?: number;
};

// What the avatar bumps into of a tree with spreading roots and a leaning trunk: the bark between the ground and the
// height of a head, as a handful of boxes. The bark is sampled into a grid of `cell` meters; every cell where it rises
// above `stepOver` gets a column (from under the ground if the bark starts low, from the bark itself if it hangs, like
// a low branch), and neighbouring columns of about the same height are joined along x.
export function lowBarkBoxes(geometry: BufferGeometry, { cell = 0.7, ground = 0, stepOver = 0.55, head = 2.4 }: LowBark = {}): TrunkCore[] {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const triangles = (index ? index.count : position.count) / 3;
  const columns = new Map<string, { ix: number; iz: number; min: number; max: number }>();
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const p = new Vector3();
  const corner = (i: number) => (index ? index.getX(i) : i);
  for (let t = 0; t < triangles; t++) {
    a.fromBufferAttribute(position, corner(t * 3));
    b.fromBufferAttribute(position, corner(t * 3 + 1));
    c.fromBufferAttribute(position, corner(t * 3 + 2));
    if (Math.min(a.y, b.y, c.y) > ground + head || Math.max(a.y, b.y, c.y) < ground - 0.2) continue;
    // Points all over the triangle, closer together than half a cell.
    const n = Math.min(10, Math.max(1, Math.ceil(Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) / (cell * 0.5))));
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n - i; j++) {
        p.set(0, 0, 0).addScaledVector(a, i / n).addScaledVector(b, j / n).addScaledVector(c, (n - i - j) / n);
        if (p.y < ground - 0.2 || p.y > ground + head) continue;
        const ix = Math.floor(p.x / cell);
        const iz = Math.floor(p.z / cell);
        const key = `${ix},${iz}`;
        const column = columns.get(key);
        if (!column) columns.set(key, { ix, iz, min: p.y, max: p.y });
        else {
          column.min = Math.min(column.min, p.y);
          column.max = Math.max(column.max, p.y);
        }
      }
    }
  }

  // Columns worth a box, row by row.
  const solid = [...columns.values()]
    .filter(({ min, max }) => max > ground + stepOver && min < ground + head - 0.4)
    .map(({ ix, iz, min, max }) => ({ ix, iz, bottom: min < ground + stepOver ? ground - 1 : min - 0.05, top: max }))
    .sort((m, n) => m.iz - n.iz || m.ix - n.ix);
  const boxes: TrunkCore[] = [];
  for (let i = 0; i < solid.length; ) {
    const first = solid[i];
    let last = first;
    let bottom = first.bottom;
    let top = first.top;
    let j = i + 1;
    while (j < solid.length && solid[j].iz === first.iz && solid[j].ix === last.ix + 1 && Math.abs(solid[j].bottom - first.bottom) < 0.5 && Math.abs(solid[j].top - first.top) < 0.7) {
      last = solid[j];
      bottom = Math.min(bottom, last.bottom);
      top = Math.max(top, last.top);
      j++;
    }
    const x0 = first.ix * cell;
    const x1 = (last.ix + 1) * cell;
    boxes.push({ center: new Vector3((x0 + x1) / 2, (bottom + top) / 2, (first.iz + 0.5) * cell), half: new Vector3((x1 - x0) / 2, (top - bottom) / 2, cell / 2) });
    i = j;
  }
  return boxes;
}

// The cuboids of every tree. Each root node of `scene` is a tree and its first mesh painted with `material` is what is
// measured (its bark, its foliage). Forests reuse a handful of tree models, so `core` runs once per geometry and its
// box or boxes are placed with each tree's transform.
export function trunkColliders(scene: Object3D, material: string, core: (geometry: BufferGeometry) => TrunkCore | TrunkCore[]): ColliderBox[] {
  scene.updateMatrixWorld(true);
  const cores = new Map<BufferGeometry, TrunkCore[]>();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const boxes: ColliderBox[] = [];
  for (const tree of scene.children) {
    let measured: Mesh | undefined;
    tree.traverse((object) => {
      const mesh = object as Mesh;
      if (!measured && mesh.isMesh && (mesh.material as Material).name === material) measured = mesh;
    });
    if (!measured) continue;
    let parts = cores.get(measured.geometry);
    if (!parts) cores.set(measured.geometry, (parts = ([] as TrunkCore[]).concat(core(measured.geometry))));
    measured.matrixWorld.decompose(position, quaternion, scale);
    const rotation = new Euler().setFromQuaternion(quaternion);
    parts.forEach((part, i) => {
      const center = part.center.clone().applyMatrix4(measured!.matrixWorld);
      boxes.push({
        id: parts!.length > 1 ? `${tree.name}:${i}` : tree.name,
        position: [center.x, center.y, center.z],
        args: [part.half.x * scale.x, part.half.y * scale.y, part.half.z * scale.z],
        rotation: [rotation.x, rotation.y, rotation.z],
      });
    });
  }
  return boxes;
}
