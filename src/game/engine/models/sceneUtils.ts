import { Group, Mesh, Quaternion, Vector3, type Object3D } from 'three';

// Invisible copies (sharing geometry) of nodes named in `names`, transformed to world coordinates.
export function pickNodes(scene: Object3D, names: readonly string[]): Group {
  scene.updateMatrixWorld(true);
  const group = new Group();
  for (const name of names) {
    const node = scene.getObjectByName(name);
    if (!node) {
      console.warn(`Node ${name} not found in model`);
      continue;
    }
    node.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const copy = new Mesh(mesh.geometry);
      mesh.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
      group.add(copy);
    });
  }
  return group;
}

// Static nodes: matrix recalculation every frame is disabled for performance.
export function freeze(scene: Object3D) {
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    object.matrixAutoUpdate = false;
  });
}

// Rest pose from the original GLB, cached on initial query. Doors rotate their nodes: subsequent calculations
// (e.g. on component remount) always start from the original pose.
export function restPose(object: Object3D): { position: Vector3; quaternion: Quaternion } {
  const stored = object.userData.restPose as { position: Vector3; quaternion: Quaternion } | undefined;
  if (stored) return stored;
  const pose = { position: object.position.clone(), quaternion: object.quaternion.clone() };
  object.userData.restPose = pose;
  return pose;
}
