import { Euler, Quaternion, Vector3, type BufferGeometry, type Material, type Mesh, type Object3D } from 'three';
import type { ColliderBox } from './colliderBoxes';

// Trunk of a tree model in its geometry's local space: box center and half-extents.
export type TrunkCore = { center: Vector3; half: Vector3 };

// The whole bounding box of the bark mesh: right for straight trunks without spreading roots (pines).
export function boundingBoxCore(geometry: BufferGeometry): TrunkCore {
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  return { center: box.getCenter(new Vector3()), half: box.getSize(new Vector3()).multiplyScalar(0.5) };
}

// One cuboid per tree. Each root node of `scene` is a tree and its first mesh painted with `barkMaterial` is the trunk.
// Forests reuse a handful of tree models, so `core` runs once per geometry and is placed with each tree's transform.
export function trunkColliders(scene: Object3D, barkMaterial: string, core: (geometry: BufferGeometry) => TrunkCore): ColliderBox[] {
  scene.updateMatrixWorld(true);
  const cores = new Map<BufferGeometry, TrunkCore>();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();
  const boxes: ColliderBox[] = [];
  for (const tree of scene.children) {
    let bark: Mesh | undefined;
    tree.traverse((object) => {
      const mesh = object as Mesh;
      if (!bark && mesh.isMesh && (mesh.material as Material).name === barkMaterial) bark = mesh;
    });
    if (!bark) continue;
    let trunk = cores.get(bark.geometry);
    if (!trunk) cores.set(bark.geometry, (trunk = core(bark.geometry)));
    bark.matrixWorld.decompose(position, quaternion, scale);
    const center = trunk.center.clone().applyMatrix4(bark.matrixWorld);
    const rotation = new Euler().setFromQuaternion(quaternion);
    boxes.push({
      id: tree.name,
      position: [center.x, center.y, center.z],
      args: [trunk.half.x * scale.x, trunk.half.y * scale.y, trunk.half.z * scale.z],
      rotation: [rotation.x, rotation.y, rotation.z],
    });
  }
  return boxes;
}
