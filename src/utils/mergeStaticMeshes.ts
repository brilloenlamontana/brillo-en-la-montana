import { Box3, Group, LOD, Mesh, Vector3, type BufferGeometry, type Material, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Junta todas las mallas fijas de un modelo en una sola malla por material (en coordenadas de mundo): un modelo con
// decenas de piezas pasa a dibujarse en tantas llamadas como materiales tenga. Solo para objetos que no se mueven.
export function mergeStaticMeshes(root: Object3D): Group {
  root.updateMatrixWorld(true);
  const groups = new Map<string, { material: Material; geometries: BufferGeometry[] }>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    // mergeGeometries exige los mismos atributos y que todas tengan índices o ninguna.
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

// Un solo THREE.LOD para todo el modelo, con cada nivel juntado por material: sirve para conjuntos compactos (la villa,
// la empalizada) que se ven cerca o lejos de una vez. distances[i] es desde dónde se dibuja el nivel i.
export function buildMergedLod(scenes: Object3D[], distances: readonly number[]): LOD {
  const center = new Box3().setFromObject(scenes[0]).getCenter(new Vector3());
  const lod = new LOD();
  lod.position.copy(center);
  scenes.forEach((scene, i) => {
    const level = mergeStaticMeshes(scene);
    level.position.copy(center).negate();
    level.updateMatrix();
    lod.addLevel(level, distances[i], 0.1);
  });
  return lod;
}
