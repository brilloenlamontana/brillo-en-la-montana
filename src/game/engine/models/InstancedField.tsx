import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Frustum, Group, InstancedMesh, Matrix4, Sphere, Vector3, type BufferGeometry, type Material, type Mesh, type Object3D } from 'three';
import { useWorldStore } from '@/game/engine/rendering/worldStore';

type Part = { batch: number; matrix: Matrix4 };
type Instance = { center: Vector3; radius: number; parts: Part[] };
type Field = {
  group: Group;
  meshes: InstancedMesh[]; // one per batch
  instances: Instance[];
  firstMatrix: Matrix4[]; // one matrix per batch, to draw a single copy while the renderer warms up
};

// Helpers shared by every field: useFrame callbacks run one at a time, so they never overlap.
const FRUSTUM = new Frustum();
const VIEW_PROJECTION = new Matrix4();
const SPHERE = new Sphere();

// Whether each instance is drawn (1), hidden (0) or unknown (-1), and how many each InstancedMesh holds while filling.
type FieldState = { field: Field; visibleOf: Int8Array; cursors: Int32Array };

function collectMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) meshes.push(object as Mesh);
  });
  return meshes;
}

// Each root node of the model (a pine, a tree, a rock...) is an instance. Nodes that share mesh and material go in the
// same batch, and each batch is a single InstancedMesh: hundreds of objects in a few draw calls.
function buildField(scene: Object3D): Field {
  scene.updateMatrixWorld(true);
  const batchIndex = new Map<string, number>();
  const batches: { capacity: number; geometry: BufferGeometry; material: Material }[] = [];
  const instances: Instance[] = [];
  const box = new Box3();
  const sphere = new Sphere();

  for (const node of scene.children) {
    box.setFromObject(node).getBoundingSphere(sphere);
    const parts = collectMeshes(node).map((mesh) => {
      const material = mesh.material as Material;
      const key = `${mesh.geometry.uuid}|${material.uuid}`;
      let batch = batchIndex.get(key);
      if (batch === undefined) {
        batch = batches.length;
        batchIndex.set(key, batch);
        batches.push({ capacity: 0, geometry: mesh.geometry, material });
      }
      batches[batch].capacity++;
      return { batch, matrix: mesh.matrixWorld.clone() };
    });
    instances.push({ center: sphere.center.clone(), radius: sphere.radius, parts });
  }

  const group = new Group();
  const meshes = batches.map(({ capacity, geometry, material }) => {
    const mesh = new InstancedMesh(geometry, material, capacity);
    mesh.count = 0;
    mesh.frustumCulled = false; // culling is done per instance in useFrame
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    return mesh;
  });
  const firstMatrix = batches.map((_, b) => instances.flatMap((instance) => instance.parts).find((part) => part.batch === b)!.matrix);
  return { group, meshes, instances, firstMatrix };
}

type InstancedFieldProps = {
  url: string;
  // Beyond this distance from the camera the instance is not drawn.
  maxDistance: number;
  enabled?: boolean;
};

// Draws only the instances inside the camera view and closer than maxDistance.
export function InstancedField({ url, maxDistance, enabled = true }: InstancedFieldProps) {
  const { scene } = useGLTF(url);
  const field = useMemo(() => buildField(scene), [scene]);
  const stateRef = useRef<FieldState | null>(null);

  // InstancedMesh.dispose only frees the instance buffers; geometry and material belong to useGLTF.
  useEffect(() => () => field.meshes.forEach((mesh) => mesh.dispose()), [field]);

  useFrame(({ camera }) => {
    const { meshes, instances, firstMatrix } = field;
    if (stateRef.current?.field !== field) {
      stateRef.current = {
        field,
        visibleOf: new Int8Array(instances.length).fill(-1),
        cursors: new Int32Array(meshes.length),
      };
    }
    const work = stateRef.current;

    // While warming up (only in the regions it can be seen from) it draws one copy of each batch.
    if (useWorldStore.getState().warming && enabled) {
      meshes.forEach((mesh, b) => {
        mesh.setMatrixAt(0, firstMatrix[b]);
        mesh.count = 1;
        mesh.instanceMatrix.needsUpdate = true;
      });
      work.visibleOf.fill(-1); // forces a full recompute once it finishes
      return;
    }

    VIEW_PROJECTION.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    FRUSTUM.setFromProjectionMatrix(VIEW_PROJECTION);
    let changed = false;
    for (let i = 0; i < instances.length; i++) {
      const { center, radius } = instances[i];
      let visible = 0;
      if (enabled && camera.position.distanceTo(center) - radius <= maxDistance) {
        SPHERE.center.copy(center);
        SPHERE.radius = radius;
        if (FRUSTUM.intersectsSphere(SPHERE)) visible = 1;
      }
      if (visible !== work.visibleOf[i]) {
        work.visibleOf[i] = visible;
        changed = true;
      }
    }
    if (!changed) return;

    work.cursors.fill(0);
    for (let i = 0; i < instances.length; i++) {
      if (work.visibleOf[i] !== 1) continue;
      for (const { batch, matrix } of instances[i].parts) meshes[batch].setMatrixAt(work.cursors[batch]++, matrix);
    }
    meshes.forEach((mesh, b) => {
      mesh.count = work.cursors[b];
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  return <primitive object={field.group} />;
}
