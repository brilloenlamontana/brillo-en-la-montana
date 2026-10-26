import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Frustum, Group, InstancedMesh, Matrix4, Sphere, Vector3, type BufferGeometry, type Material, type Mesh, type Object3D } from 'three';
import { InteractionPrompt } from '@/game/engine/interaction/InteractionPrompt';
import { useInteractKey } from '@/game/engine/interaction/useInteractKey';
import { useWorldStore } from '@/game/engine/rendering/worldStore';
import { usePlayerStore } from '@/game/player/playerStore';
import { useProgressStore } from '@/store/progressStore';
import { DESAFIO2_MODELS } from '../assets';
import { EAT_RANGE, LENS_RANGE } from '../items';
import { isFrutoBueno } from '../mission';
import { comerFruto } from './comer';
import { isLenteActivo } from './lente';

const URL = DESAFIO2_MODELS.bosqueOscuridad.manzanas;
// The skin of the fruit (the stem keeps its color). Its red comes from vertex colors averaging this red channel.
const SKIN_MATERIAL = 'BosqueManzana';
const SKIN_RED = 0.157;
// Linear yellow the skin turns into, at that average brightness (the shading of the vertex colors is kept).
const SKIN_YELLOW = [0.95, 0.62, 0.04] as const;

// How a fruit looks this frame.
const HIDDEN = 0;
const RED = 1;
const YELLOW = 2;

type Part = { red: number; yellow: number; matrix: Matrix4 }; // batch when red / when yellow
type Fruit = { good: boolean; center: Vector3; radius: number; top: number; parts: Part[] };
type Orchard = { group: Group; meshes: InstancedMesh[]; fruits: Fruit[]; yellowGeometries: BufferGeometry[] };

const FRUSTUM = new Frustum();
const VIEW_PROJECTION = new Matrix4();
const SPHERE = new Sphere();

// The same skin with its vertex colors turned yellow: one more geometry per variant, no special material (works the
// same with WebGPU and WebGL).
function yellowSkin(geometry: BufferGeometry): BufferGeometry {
  const copy = geometry.clone();
  const color = copy.getAttribute('color');
  if (!color) return copy;
  for (let i = 0; i < color.count; i++) {
    const brightness = color.getX(i) / SKIN_RED;
    color.setXYZ(i, Math.min(1, SKIN_YELLOW[0] * brightness), Math.min(1, SKIN_YELLOW[1] * brightness), Math.min(1, SKIN_YELLOW[2] * brightness));
  }
  color.needsUpdate = true;
  return copy;
}

function meshesOf(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverse((object) => {
    if ((object as Mesh).isMesh) meshes.push(object as Mesh);
  });
  return meshes;
}

// Each root node of BosqueManzanas.glb is a fruit (its index decides whether it is good). Parts sharing geometry and
// material are drawn by one InstancedMesh; each skin also has a yellow batch the fruit moves to under the lens.
function buildOrchard(scene: Object3D): Orchard {
  scene.updateMatrixWorld(true);
  const batchIndex = new Map<string, number>();
  const batches: { geometry: BufferGeometry; material: Material; capacity: number }[] = [];
  const yellowOf = new Map<string, BufferGeometry>();
  const batchOf = (geometry: BufferGeometry, material: Material) => {
    const key = `${geometry.uuid}|${material.uuid}`;
    let batch = batchIndex.get(key);
    if (batch === undefined) {
      batch = batches.length;
      batchIndex.set(key, batch);
      batches.push({ geometry, material, capacity: 0 });
    }
    batches[batch].capacity++;
    return batch;
  };
  const box = new Box3();
  const sphere = new Sphere();

  const fruits = scene.children.map((node, index): Fruit => {
    box.setFromObject(node).getBoundingSphere(sphere);
    const parts = meshesOf(node).map((mesh): Part => {
      const material = mesh.material as Material;
      const red = batchOf(mesh.geometry, material);
      if (material.name !== SKIN_MATERIAL) return { red, yellow: red, matrix: mesh.matrixWorld.clone() };
      let yellowGeometry = yellowOf.get(mesh.geometry.uuid);
      if (!yellowGeometry) {
        yellowGeometry = yellowSkin(mesh.geometry);
        yellowOf.set(mesh.geometry.uuid, yellowGeometry);
      }
      return { red, yellow: batchOf(yellowGeometry, material), matrix: mesh.matrixWorld.clone() };
    });
    return { good: isFrutoBueno(index), center: sphere.center.clone(), radius: sphere.radius, top: box.max.y, parts };
  });

  const group = new Group();
  const meshes = batches.map(({ geometry, material, capacity }) => {
    const mesh = new InstancedMesh(geometry, material, capacity);
    mesh.count = 0;
    mesh.frustumCulled = false; // culled per fruit in useFrame
    mesh.matrixAutoUpdate = false;
    group.add(mesh);
    return mesh;
  });
  return { group, meshes, fruits, yellowGeometries: [...yellowOf.values()] };
}

type FrutosBosqueProps = {
  // Beyond this distance from the camera a fruit is not drawn.
  maxDistance: number;
  // Drawn (and edible) from where the player is.
  enabled: boolean;
};

// The fruit of the Dark Forest (BosqueManzanas.glb). They all look red; while the player looks through the elf's lens
// the good ones nearby turn yellow. The nearest one can be eaten (E or a tap): the good ones are saved as eaten and no
// longer drawn, a poisonous one is deadly (see comer.ts).
export function FrutosBosque({ maxDistance, enabled }: FrutosBosqueProps) {
  const { scene } = useGLTF(URL);
  const orchard = useMemo(() => buildOrchard(scene), [scene]);
  const looks = useRef<Int8Array | null>(null);
  // Poisonous fruits bitten this session: they are not drawn again until the page reloads.
  const bitten = useRef(new Set<number>());
  const [focused, setFocused] = useState<number | null>(null);
  const focusedRef = useRef<number | null>(null);

  // InstancedMesh.dispose only frees the instance buffers; the red geometries and the material belong to useGLTF.
  useEffect(
    () => () => {
      orchard.meshes.forEach((mesh) => mesh.dispose());
      orchard.yellowGeometries.forEach((geometry) => geometry.dispose());
    },
    [orchard],
  );

  useFrame(({ camera }) => {
    const { meshes, fruits } = orchard;
    if (looks.current?.length !== fruits.length) looks.current = new Int8Array(fruits.length).fill(-1);
    const look = looks.current;

    // While warming up it draws one fruit of each batch, red and yellow, so neither stutters the first time.
    if (useWorldStore.getState().warming && enabled) {
      meshes.forEach((mesh, batch) => {
        const part = fruits.flatMap((fruit) => fruit.parts).find((candidate) => candidate.red === batch || candidate.yellow === batch)!;
        mesh.setMatrixAt(0, part.matrix);
        mesh.count = 1;
        mesh.instanceMatrix.needsUpdate = true;
      });
      look.fill(-1);
      return;
    }

    VIEW_PROJECTION.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    FRUSTUM.setFromProjectionMatrix(VIEW_PROJECTION);
    const player = usePlayerStore.getState();
    const eaten = useProgressStore.getState().progress.frutosComidos;
    const lens = isLenteActivo();
    const canEat = enabled && player.health > 0;
    let nearest: number | null = null;
    let nearestDistance = EAT_RANGE;
    let changed = false;

    fruits.forEach((fruit, i) => {
      const gone = eaten.includes(i) || bitten.current.has(i);
      let next = HIDDEN;
      if (enabled && !gone && camera.position.distanceTo(fruit.center) - fruit.radius <= maxDistance) {
        SPHERE.center.copy(fruit.center);
        SPHERE.radius = fruit.radius;
        if (FRUSTUM.intersectsSphere(SPHERE)) next = lens && fruit.good && fruit.center.distanceTo(player.position) <= LENS_RANGE ? YELLOW : RED;
      }
      if (next !== look[i]) {
        look[i] = next;
        changed = true;
      }
      if (!canEat || gone) return;
      const heightAboveFeet = fruit.center.y - player.position.y;
      if (heightAboveFeet < -0.8 || heightAboveFeet > 1.5) return;
      const distance = Math.hypot(fruit.center.x - player.position.x, fruit.center.z - player.position.z) - fruit.radius;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = i;
      }
    });

    if (nearest !== focusedRef.current) {
      focusedRef.current = nearest;
      setFocused(nearest);
    }
    if (!changed) return;

    const cursors = new Int32Array(meshes.length);
    fruits.forEach((fruit, i) => {
      if (look[i] === HIDDEN) return;
      for (const part of fruit.parts) {
        const batch = look[i] === YELLOW ? part.yellow : part.red;
        meshes[batch].setMatrixAt(cursors[batch]++, part.matrix);
      }
    });
    meshes.forEach((mesh, batch) => {
      mesh.count = cursors[batch];
      mesh.instanceMatrix.needsUpdate = true;
    });
  });

  const eat = useCallback(() => {
    const index = focusedRef.current;
    if (index === null) return;
    if (!comerFruto(index)) bitten.current.add(index);
    focusedRef.current = null;
    setFocused(null);
  }, []);

  useInteractKey(focused !== null, eat);

  const fruit = focused === null ? null : orchard.fruits[focused];
  return (
    <>
      <primitive object={orchard.group} />
      {fruit && (
        <Html position={[fruit.center.x, fruit.top + 0.35, fruit.center.z]} center>
          <InteractionPrompt action="comer la fruta" onActivate={eat} />
        </Html>
      )}
    </>
  );
}

useGLTF.preload(URL);
