import { Box3, Group, LOD, Matrix4, Object3D, Vector3 } from 'three';

export type LodLevel = { scene: Object3D | null; distance: number };

const LOD_HYSTERESIS = 0.1;

// Envuelve cada nodo raíz del modelo en un THREE.LOD centrado en ese nodo, para que la distancia se mida por objeto
// (pino, árbol, roca...) y no desde el origen del GLB. Los niveles se emparejan por nombre de nodo;
// un nivel con scene null deja el nodo oculto a partir de esa distancia.
export function buildLodGroup(levels: LodLevel[]): Group {
  const group = new Group();
  const base = levels[0]?.scene;
  if (!base) return group;

  levels.forEach(({ scene }) => scene?.updateMatrixWorld(true));

  for (const node of base.children) {
    const center = new Box3().setFromObject(node).getCenter(new Vector3());
    const toLodSpace = new Matrix4().makeTranslation(-center.x, -center.y, -center.z);
    const lod = new LOD();
    lod.position.copy(center);

    for (const { scene, distance } of levels) {
      const source = scene ? (scene.getObjectByName(node.name) ?? node) : null;
      lod.addLevel(source ? placeCopy(source, toLodSpace) : new Object3D(), distance, LOD_HYSTERESIS);
    }
    group.add(lod);
  }

  return group;
}

// clone() comparte geometría y material, así que cada nivel no duplica memoria de GPU.
function placeCopy(source: Object3D, toLodSpace: Matrix4): Object3D {
  const copy = source.clone();
  toLodSpace.clone().multiply(source.matrixWorld).decompose(copy.position, copy.quaternion, copy.scale);
  return copy;
}
