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

type Trunk = {
  // Height of the ground in the model (its roots go below it).
  ground?: number;
  // The trunk is measured between these heights over the ground (m): above the flare of the roots, under the branches.
  band?: readonly [number, number];
  // Height of the box over the ground (m).
  height?: number;
};

// The trunk alone of a tree with spreading roots and low branches, as one box: neither the roots nor the branches get
// in the way. The bark between the heights of `band` is sampled; the trunk is where most of it is (the median), and
// its half-width the distance most of those points are within, so a branch crossing that height does not widen it.
export function trunkBox(geometry: BufferGeometry, { ground = 0, band = [0.8, 1.7], height = 3 }: Trunk = {}): TrunkCore {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const triangles = (index ? index.count : position.count) / 3;
  const corner = (i: number) => (index ? index.getX(i) : i);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const p = new Vector3();
  const xs: number[] = [];
  const zs: number[] = [];
  for (let t = 0; t < triangles; t++) {
    a.fromBufferAttribute(position, corner(t * 3));
    b.fromBufferAttribute(position, corner(t * 3 + 1));
    c.fromBufferAttribute(position, corner(t * 3 + 2));
    if (Math.min(a.y, b.y, c.y) > ground + band[1] || Math.max(a.y, b.y, c.y) < ground + band[0]) continue;
    // Points all over the triangle, about 0.3 m apart.
    const n = Math.min(10, Math.max(1, Math.ceil(Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a)) / 0.3)));
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n - i; j++) {
        p.set(0, 0, 0).addScaledVector(a, i / n).addScaledVector(b, j / n).addScaledVector(c, (n - i - j) / n);
        if (p.y < ground + band[0] || p.y > ground + band[1]) continue;
        xs.push(p.x);
        zs.push(p.z);
      }
    }
  }
  if (xs.length === 0) return boundingBoxCore(geometry);
  const middle = (values: number[]) => [...values].sort((m, n) => m - n)[Math.floor(values.length / 2)];
  const x = middle(xs);
  const z = middle(zs);
  const reach = xs.map((value, i) => Math.hypot(value - x, zs[i] - z)).sort((m, n) => m - n);
  // A square inside the circle most of the bark is within; never thinner than a sapling nor wider than a great trunk.
  const half = Math.min(1.4, Math.max(0.3, reach[Math.floor(reach.length * 0.7)] * 0.85));
  const bottom = ground - 1;
  const top = ground + height;
  return { center: new Vector3(x, (bottom + top) / 2, z), half: new Vector3(half, (top - bottom) / 2, half) };
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
