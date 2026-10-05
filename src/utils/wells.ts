import { Vector3, type Mesh, type Object3D } from 'three';
import type { ColliderBox } from '../components/models-3d/CameraColliderBoxes';

export const PANTANO_POZOS_URL = '/models-3d/map/PantanoTristeza/PantanoPozos.glb';

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

// Los pozos son irregulares y el terreno tiene un hueco sobre cada uno. Por sector angular se mide:
// - el radio exterior de la malla: ahí va la pared física, fuera del hueco, para no crear cornisas invisibles;
// - el radio interior de la pared: ahí va la pared de cámara, para que no se salga de lo oscuro.
export function getPantanoWells(scene: Object3D): Well[] {
  const cached = wellsCache.get(scene);
  if (cached) return cached;
  scene.updateMatrixWorld(true);
  const wells = scene.children.map(buildWell);
  wellsCache.set(scene, wells);
  return wells;
}

function buildWell(node: Object3D): Well {
  const points: Vector3[] = [];
  node.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      points.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld));
    }
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

  const physicsBoxes = outer.map((r, s) => ringBox(`${node.name}-pared-${s}`, x, z, s, r, PHYSICS_WALL_THICKNESS, bottomY - 0.5, rimY - 0.15));
  const floorHalf = outerRadius + PHYSICS_WALL_THICKNESS;
  physicsBoxes.push({ id: `${node.name}-fondo`, position: [x, bottomY - 0.25, z], args: [floorHalf, 0.25, floorHalf] });
  const cameraBoxes = inner.map((r, s) => ringBox(`${node.name}-camara-${s}`, x, z, s, r, CAMERA_WALL_THICKNESS, bottomY, rimY - 0.6));

  return { name: node.name, x, z, rimY, bottomY, innerRadius, outerRadius, physicsBoxes, cameraBoxes };
}

// Caja tangente al pozo cuya cara interior queda a `radius` del centro, cubriendo el sector `segment`.
function ringBox(id: string, x: number, z: number, segment: number, radius: number, thickness: number, bottom: number, top: number): ColliderBox {
  const angle = (segment + 0.5) * SEGMENT_ANGLE;
  const center = radius + thickness / 2;
  const halfChord = (radius + thickness) * Math.tan(SEGMENT_ANGLE / 2) + 0.05;
  return {
    id,
    position: [x + center * Math.cos(angle), (bottom + top) / 2, z + center * Math.sin(angle)],
    args: [thickness / 2, (top - bottom) / 2, halfChord],
    rotation: [0, -angle, 0],
  };
}

export function findWellUnder(wells: Well[], x: number, y: number, z: number, depth: number): Well | undefined {
  return wells.find((w) => y < w.rimY - depth && Math.hypot(x - w.x, z - w.z) < w.outerRadius);
}

const EXIT_MARGIN = 1.2;

// Punto en el borde del pozo para salir con la soga, evitando caer en otro pozo vecino.
export function findWellExit(well: Well, wells: Well[]): { x: number; y: number; z: number } {
  const radius = well.outerRadius + EXIT_MARGIN;
  for (let k = 0; k < 8; k++) {
    const angle = (k * Math.PI) / 4;
    const x = well.x + Math.cos(angle) * radius;
    const z = well.z + Math.sin(angle) * radius;
    if (wells.every((w) => Math.hypot(x - w.x, z - w.z) > w.outerRadius + 0.5)) return { x, y: well.rimY + 1.5, z };
  }
  return { x: well.x + radius, y: well.rimY + 1.5, z: well.z };
}

// Pozo más cercano a (x, z) que cumpla los filtros; `rank` permite repartir varios enemigos en pozos distintos.
export function pickWell(
  wells: Well[],
  x: number,
  z: number,
  { minDistance = 0, minInnerRadius = 0, rank = 0 }: { minDistance?: number; minInnerRadius?: number; rank?: number } = {},
): Well {
  const byDistance = (a: Well, b: Well) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z);
  const candidates = wells
    .filter((w) => w.innerRadius >= minInnerRadius && Math.hypot(w.x - x, w.z - z) >= minDistance)
    .sort(byDistance);
  const pool = candidates.length ? candidates : [...wells].sort(byDistance);
  return pool[Math.min(rank, pool.length - 1)];
}
