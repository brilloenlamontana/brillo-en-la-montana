import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Frustum, Group, InstancedMesh, Matrix4, Sphere, Vector3, type BufferGeometry, type Material, type Mesh, type Object3D } from 'three';
import { useWorldStore } from '../../../store/worldStore';
import { pickLodLevel } from '../../../utils/lod';

type Part = { batch: number; matrix: Matrix4 };
type Instance = { center: Vector3; radius: number; parts: Part[] };
type Field = {
  group: Group;
  meshes: InstancedMesh[][]; // [lote][nivel de detalle]
  instances: Instance[];
  firstMatrix: Matrix4[]; // una matriz por lote, para dibujar una copia al calentar el renderer
};

// Auxiliares compartidos por todos los campos: useFrame corre de a uno, así que nunca se pisan.
const FRUSTUM = new Frustum();
const VIEW_PROJECTION = new Matrix4();
const SPHERE = new Sphere();

// Nivel que dibuja cada instancia (-1 = no se dibuja) y cuántas lleva cada InstancedMesh al llenarlas.
type FieldState = { field: Field; levelOf: Int8Array; cursors: Int32Array[] };

function collectMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) meshes.push(object as Mesh);
  });
  return meshes;
}

// Cada nodo raíz del modelo (un pino, un árbol, una roca...) es una instancia. Los nodos que comparten malla y material
// van en un mismo lote, y cada lote tiene un InstancedMesh por nivel de detalle: cientos de objetos en pocas llamadas
// de dibujo. Los niveles se emparejan por nombre de nodo, igual que en buildLodGroup.
function buildField(scenes: Object3D[]): Field {
  const [base] = scenes;
  scenes.forEach((scene) => scene.updateMatrixWorld(true));
  const batchIndex = new Map<string, number>();
  const batches: { capacity: number; levels: BufferGeometry[]; material: Material }[] = [];
  const instances: Instance[] = [];
  const box = new Box3();
  const sphere = new Sphere();

  for (const node of base.children) {
    box.setFromObject(node).getBoundingSphere(sphere);
    const baseMeshes = collectMeshes(node);
    const levelMeshes = scenes.map((scene) => {
      const match = scene.getObjectByName(node.name);
      return match ? collectMeshes(match) : baseMeshes;
    });
    const parts = baseMeshes.map((mesh, j) => {
      const material = mesh.material as Material;
      const key = `${mesh.geometry.uuid}|${material.uuid}`;
      let batch = batchIndex.get(key);
      if (batch === undefined) {
        batch = batches.length;
        batchIndex.set(key, batch);
        // Todos los niveles usan el material del modelo completo: los niveles simplificados no tienen texturas ni UV.
        batches.push({ capacity: 0, material, levels: levelMeshes.map((meshes) => (meshes[j] ?? mesh).geometry) });
      }
      batches[batch].capacity++;
      return { batch, matrix: mesh.matrixWorld.clone() };
    });
    instances.push({ center: sphere.center.clone(), radius: sphere.radius, parts });
  }

  const group = new Group();
  const meshes = batches.map(({ capacity, levels, material }) =>
    levels.map((geometry) => {
      const mesh = new InstancedMesh(geometry, material, capacity);
      mesh.count = 0;
      mesh.frustumCulled = false; // el recorte se hace por instancia en useFrame
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      return mesh;
    }),
  );
  const firstMatrix = batches.map((_, b) => instances.flatMap((instance) => instance.parts).find((part) => part.batch === b)!.matrix);
  return { group, meshes, instances, firstMatrix };
}

type InstancedFieldProps = {
  // urls[i] se dibuja desde distances[i] metros de la cámara (distances[0] = 0).
  urls: string[];
  distances: readonly number[];
  // Más allá de esta distancia la instancia no se dibuja.
  maxDistance: number;
  enabled?: boolean;
};

// Dibuja solo las instancias dentro de la vista de la cámara y a menos de maxDistance, cada una con el nivel de detalle
// que le toca por distancia. Pasa urls y distances como constantes de módulo.
export function InstancedField({ urls, distances, maxDistance, enabled = true }: InstancedFieldProps) {
  const gltfs = useGLTF(urls);
  const field = useMemo(() => buildField(gltfs.map((gltf) => gltf.scene)), [gltfs]);
  const stateRef = useRef<FieldState | null>(null);

  // InstancedMesh.dispose libera solo los buffers de instancias; la geometría y el material son de useGLTF.
  useEffect(() => () => field.meshes.flat().forEach((mesh) => mesh.dispose()), [field]);

  useFrame(({ camera }) => {
    const { meshes, instances, firstMatrix } = field;
    if (stateRef.current?.field !== field) {
      stateRef.current = {
        field,
        levelOf: new Int8Array(instances.length).fill(-1),
        cursors: meshes.map((levels) => new Int32Array(levels.length)),
      };
    }
    const work = stateRef.current;

    if (useWorldStore.getState().warming) {
      meshes.forEach((levels, b) =>
        levels.forEach((mesh) => {
          mesh.setMatrixAt(0, firstMatrix[b]);
          mesh.count = 1;
          mesh.instanceMatrix.needsUpdate = true;
        }),
      );
      work.levelOf.fill(-2); // fuerza a recalcular todo al terminar
      return;
    }

    VIEW_PROJECTION.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    FRUSTUM.setFromProjectionMatrix(VIEW_PROJECTION);
    let changed = false;
    for (let i = 0; i < instances.length; i++) {
      const { center, radius } = instances[i];
      let level = -1;
      if (enabled) {
        const distance = camera.position.distanceTo(center);
        if (distance - radius <= maxDistance) {
          SPHERE.center.copy(center);
          SPHERE.radius = radius;
          if (FRUSTUM.intersectsSphere(SPHERE)) level = pickLodLevel(distance, distances, work.levelOf[i]);
        }
      }
      if (level !== work.levelOf[i]) {
        work.levelOf[i] = level;
        changed = true;
      }
    }
    if (!changed) return;

    work.cursors.forEach((cursor) => cursor.fill(0));
    for (let i = 0; i < instances.length; i++) {
      const level = work.levelOf[i];
      if (level < 0) continue;
      for (const { batch, matrix } of instances[i].parts) meshes[batch][level].setMatrixAt(work.cursors[batch][level]++, matrix);
    }
    meshes.forEach((levels, b) =>
      levels.forEach((mesh, level) => {
        mesh.count = work.cursors[b][level];
        mesh.instanceMatrix.needsUpdate = true;
      }),
    );
  });

  return <primitive object={field.group} />;
}
