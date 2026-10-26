import { Group, Mesh, type BufferGeometry, type Material, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Merges all static meshes in a model into a single mesh per material (in world coordinates):
// a model with dozens of pieces is rendered in as many draw calls as it has materials.
// Only suitable for objects that do not move independently.
export function mergeStaticMeshes(root: Object3D): Group {
  root.updateMatrixWorld(true);
  const groups = new Map<string, { material: Material; geometries: BufferGeometry[] }>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    // mergeGeometries requires identical attributes and either all or none having indices.
    const key = `${mesh.material.uuid}|${Object.keys(geometry.attributes).sort().join(',')}|${geometry.index ? 'i' : 'n'}`;
    if (!groups.has(key)) groups.set(key, { material: mesh.material, geometries: [] });
    groups.get(key)!.geometries.push(geometry);
  });

  const group = new Group();
  for (const { material, geometries } of groups.values()) {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) continue;
    merged.computeBoundingSphere();
    const mesh = new Mesh(merged, material);
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
  }
  group.matrixAutoUpdate = false;
  return group;
}
