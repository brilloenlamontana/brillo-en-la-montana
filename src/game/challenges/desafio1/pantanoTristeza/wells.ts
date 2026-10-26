import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Vector3, type Mesh, type Object3D } from 'three';
import { ringBoxes, type ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { DESAFIO1_MODELS } from '../assets';

export const POZOS_URL = DESAFIO1_MODELS.pantanoTristeza.pozos;

export type Well = {
  name: string;
  x: number;
  z: number;
  rimY: number;
  bottomY: number;
  innerRadius: number;
  outerRadius: number;
  physicsBoxes: ColliderBox[];
  cameraBoxes: ColliderBox[];
};

const SEGMENTS = 8;
const SEGMENT_ANGLE = (2 * Math.PI) / SEGMENTS;
const PHYSICS_WALL_THICKNESS = 0.6;
const CAMERA_WALL_THICKNESS = 0.3;

const wellsCache = new WeakMap<Object3D, Well[]>();

// The swamp wells are irregular and the terrain has an opening over each one. Each well is measured per angular
// segment: the outer radius of its mesh holds the physics wall (outside the hole, so there is no invisible ledge) and
// the radius of its inner wall holds the camera blocker (so the camera stays inside the dark well).
function getPantanoWells(scene: Object3D): Well[] {
  const cached = wellsCache.get(scene);
  if (cached) return cached;
  scene.updateMatrixWorld(true);
  const wells = scene.children.map(buildWell);
  wellsCache.set(scene, wells);
  return wells;
}

// Wells of the Swamp of Sadness, measured once from PantanoPozos.glb and shared by every user.
export function usePantanoWells(): Well[] {
  const { scene } = useGLTF(POZOS_URL);
  return useMemo(() => getPantanoWells(scene), [scene]);
}

function buildWell(node: Object3D): Well {
  const points: Vector3[] = [];
  node.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) points.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
  });

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, bottomY = Infinity, rimY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
    bottomY = Math.min(bottomY, p.y); rimY = Math.max(rimY, p.y);
  }
  const x = (minX + maxX) / 2;
  const z = (minZ + maxZ) / 2;

  const outer = new Array<number>(SEGMENTS).fill(0);
  const inner = new Array<number>(SEGMENTS).fill(Infinity);
  for (const p of points) {
    const r = Math.hypot(p.x - x, p.z - z);
    const s = Math.floor(((Math.atan2(p.z - z, p.x - x) + 2 * Math.PI) % (2 * Math.PI)) / SEGMENT_ANGLE) % SEGMENTS;
    outer[s] = Math.max(outer[s], r);
    if (p.y > bottomY + 1 && p.y < rimY - 1) inner[s] = Math.min(inner[s], r);
  }
  const outerRadius = Math.max(...outer);
  const knownInner = inner.filter(Number.isFinite);
  const innerRadius = knownInner.length ? Math.min(...knownInner) : outerRadius / 2;
  for (let s = 0; s < SEGMENTS; s++) {
    if (outer[s] === 0) outer[s] = outerRadius;
    if (!Number.isFinite(inner[s])) inner[s] = innerRadius;
  }

  const floorHalf = outerRadius + PHYSICS_WALL_THICKNESS;
  const physicsBoxes = [
    ...ringBoxes(`${node.name}-pared`, [x, z], outer, PHYSICS_WALL_THICKNESS, bottomY - 0.5, rimY - 0.15, { segments: SEGMENTS }),
    { id: `${node.name}-fondo`, position: [x, bottomY - 0.25, z], args: [floorHalf, 0.25, floorHalf] } satisfies ColliderBox,
  ];
  const cameraBoxes = ringBoxes(`${node.name}-camara`, [x, z], inner, CAMERA_WALL_THICKNESS, bottomY, rimY - 0.6, { segments: SEGMENTS });

  return { name: node.name, x, z, rimY, bottomY, innerRadius, outerRadius, physicsBoxes, cameraBoxes };
}

// Well whose hole the point (feet) is `depth` meters below the rim of.
export function findWellUnder(wells: readonly Well[], x: number, y: number, z: number, depth: number): Well | undefined {
  return wells.find((w) => y < w.rimY - depth && Math.hypot(x - w.x, z - w.z) < w.outerRadius);
}

export const isInsideWell = (well: Well, x: number, y: number, z: number) => y < well.rimY && Math.hypot(x - well.x, z - well.z) < well.outerRadius + 1;

const EXIT_MARGIN = 1.2;

// Point on the rim to climb out with the rope, away from any neighboring well.
export function findWellExit(well: Well, wells: readonly Well[]): { x: number; y: number; z: number } {
  const radius = well.outerRadius + EXIT_MARGIN;
  for (let k = 0; k < 8; k++) {
    const angle = (k * Math.PI) / 4;
    const x = well.x + Math.cos(angle) * radius;
    const z = well.z + Math.sin(angle) * radius;
    if (wells.every((w) => Math.hypot(x - w.x, z - w.z) > w.outerRadius + 0.5)) return { x, y: well.rimY + 1.5, z };
  }
  return { x: well.x + radius, y: well.rimY + 1.5, z: well.z };
}

// Closest well to (x, z) matching the filters; `rank` spreads enemies over different wells.
export function pickWell(
  wells: readonly Well[],
  x: number,
  z: number,
  { minDistance = 0, minInnerRadius = 0, rank = 0 }: { minDistance?: number; minInnerRadius?: number; rank?: number } = {},
): Well {
  const byDistance = (a: Well, b: Well) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z);
  const candidates = wells.filter((w) => w.innerRadius >= minInnerRadius && Math.hypot(w.x - x, w.z - z) >= minDistance).sort(byDistance);
  const pool = candidates.length ? candidates : [...wells].sort(byDistance);
  return pool[Math.min(rank, pool.length - 1)];
}
