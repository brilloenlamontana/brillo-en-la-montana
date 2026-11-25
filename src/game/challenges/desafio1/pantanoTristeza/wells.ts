import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Vector3, type Mesh, type Object3D } from 'three';
import { ringBoxes, type ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { DESAFIO1_MODELS } from '../assets';

const POZOS_URL = DESAFIO1_MODELS.pantanoTristeza.pozos;

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
// The wells once measured, for what lives outside the canvas (the bubbling heard near them).
let measured: readonly Well[] = [];

// Rim of the well nearest to (x, z), or null before the swamp was ever drawn.
export function nearestWellRim(x: number, z: number) {
  let nearest: Well | null = null;
  let best = Infinity;
  for (const well of measured) {
    const distance = Math.hypot(well.x - x, well.z - z);
    if (distance < best) [best, nearest] = [distance, well];
  }
  return nearest && { x: nearest.x, y: nearest.rimY, z: nearest.z };
}

// The swamp wells are irregular and the terrain's physics has an opening over each one. Each well is measured per angular
// segment: the outer radius of its mesh holds the physics wall (outside the hole, so there is no invisible ledge) and
// the radius of its inner wall holds the camera blocker (so the camera stays inside the dark well).
function getPantanoWells(scene: Object3D): Well[] {
  const cached = wellsCache.get(scene);
  if (cached) return cached;
  scene.updateMatrixWorld(true);
  const wells = scene.children.map(buildWell);
  wellsCache.set(scene, wells);
  measured = wells;
  return wells;
}

// Wells of the Swamp of Sadness, measured once from PantanoPozosFisica.glb and shared by every user.
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

// Whoever is this far under a rim counts as down the well up to this far past its walls (m): the floor of a well and
// the dark under the ground reach a little beyond them, and nobody down there must be left without a way out.
const AROUND = 2;

// Only that deep (m under the rim): beside a well on a hillside the ground itself can be a couple of metres lower.
const AROUND_DEPTH = 3.5;

// Well the point (feet) is down: `depth` meters below its rim and within its walls, or deep down just past them. The
// nearest one.
export function findWellUnder(wells: readonly Well[], x: number, y: number, z: number, depth: number): Well | undefined {
  let found: Well | undefined;
  let best = Infinity;
  for (const w of wells) {
    if (y >= w.rimY - depth) continue;
    const distance = Math.hypot(x - w.x, z - w.z);
    const reach = w.outerRadius + (y < w.rimY - AROUND_DEPTH ? AROUND : 0);
    if (distance < reach && distance < best) [best, found] = [distance, w];
  }
  return found;
}

export const isInsideWell = (well: Well, x: number, y: number, z: number) => y < well.rimY && Math.hypot(x - well.x, z - well.z) < well.outerRadius + AROUND + 0.5;

const EXIT_MARGINS = [1.2, 2.2, 3.2] as const;
// The avatar is set down this far over the ground (m).
const EXIT_DROP = 1.2;

// Where to stand after climbing out with the rope: beside the well, on real ground (`groundAt`: height of the terrain
// at a point, null over a hole), away from any neighboring well and at about the height of the rim. Next to a slope
// the ground beside the well can be well above its rim: the point is taken where it is most level with it, and the
// avatar is set down over the ground that is really there, never inside the hill.
export function findWellExit(
  well: Well,
  wells: readonly Well[],
  groundAt: (x: number, z: number) => number | null = () => well.rimY,
): { x: number; y: number; z: number } {
  let exit: { x: number; y: number; z: number } | null = null;
  let best = Infinity;
  for (const margin of EXIT_MARGINS) {
    const radius = well.outerRadius + margin;
    for (let k = 0; k < 8; k++) {
      const angle = (k * Math.PI) / 4;
      const x = well.x + Math.cos(angle) * radius;
      const z = well.z + Math.sin(angle) * radius;
      if (!wells.every((w) => Math.hypot(x - w.x, z - w.z) > w.outerRadius + 0.8)) continue;
      const ground = groundAt(x, z);
      if (ground === null) continue;
      const step = Math.abs(ground - well.rimY) + margin * 0.15;
      if (step < best) [best, exit] = [step, { x, y: ground + EXIT_DROP, z }];
    }
    // Level ground right beside the well: no need to look farther.
    if (exit && best < 0.6 + margin * 0.15) break;
  }
  return exit ?? { x: well.x + well.outerRadius + EXIT_MARGINS[0], y: well.rimY + 1.5, z: well.z };
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
