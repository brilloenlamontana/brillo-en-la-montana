import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { chevronGeometry } from '@/game/engine/geometry/chevron';
import { usePlayerStore } from '@/game/player/playerStore';
import { TUNEL_EDGES, TUNEL_NODES, type TunelEdge, type TunelNodeId } from '@/game/world/tunelesRed';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { getItemState } from '../mission';
import { useTunelStore } from '../tunelStore';
import { VISIBLE_FROM } from '../visibility';

// Arrows of the trail: how far ahead of the player it reaches (m), their spacing and how high they float.
const TRAIL_LENGTH = 30;
const SPACING = 1.3;
const FIRST_ARROW = 1.2;
const HOVER = 0.12;
const MAX_ARROWS = Math.ceil(TRAIL_LENGTH / SPACING);
// The route is worked out again this often (s); the arrows glow in a wave that runs toward the exit.
const REROUTE_SECONDS = 0.15;
const WAVE_SPEED = 6;
const WAVE_LENGTH = 7;
// Heights count double when looking for the gallery the player is in: one gallery loops under another.
const HEIGHT_WEIGHT = 2;
const FORWARD = new Vector3(0, 0, 1);
const EXIT: TunelNodeId = 'X';

type Point3 = readonly [number, number, number];
type Hop = { edge: TunelEdge; to: TunelNodeId; points: readonly Point3[] };

const length3 = (a: Point3, b: Point3) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
const edgeLength = (edge: TunelEdge) => edge.floor.slice(1).reduce((sum, point, i) => sum + length3(edge.floor[i], point), 0);

// Shortest way to the summit exit from every node of the maze (Dijkstra from the exit): how far it is, and which
// gallery to take.
function buildRoutes() {
  const lengths = new Map(TUNEL_EDGES.map((edge) => [edge.id, edgeLength(edge)]));
  const distance = Object.fromEntries(Object.keys(TUNEL_NODES).map((id) => [id, Infinity])) as Record<TunelNodeId, number>;
  const next: Partial<Record<TunelNodeId, Hop>> = {};
  distance[EXIT] = 0;
  const pending = new Set(Object.keys(TUNEL_NODES) as TunelNodeId[]);
  while (pending.size) {
    let node: TunelNodeId | null = null;
    for (const candidate of pending) if (node === null || distance[candidate] < distance[node]) node = candidate;
    if (node === null || distance[node] === Infinity) break;
    pending.delete(node);
    for (const edge of TUNEL_EDGES) {
      if (edge.from !== node && edge.to !== node) continue;
      const other = edge.from === node ? edge.to : edge.from;
      const through = distance[node] + (lengths.get(edge.id) ?? 0);
      if (through < distance[other]) {
        distance[other] = through;
        // Leaving `other` toward `node`: the gallery's points in that order.
        next[other] = { edge, to: node, points: edge.from === other ? edge.floor : [...edge.floor].reverse() };
      }
    }
  }
  return { lengths, distance, next };
}

const ROUTES = buildRoutes();

// Floor points of the way to the exit, starting at the point of the maze nearest to the player.
function routeFrom(player: Vector3): Point3[] {
  let best = Infinity;
  let found: { edge: TunelEdge; index: number; t: number } | null = null;
  for (const edge of TUNEL_EDGES) {
    for (let i = 1; i < edge.floor.length; i++) {
      const [ax, ay, az] = edge.floor[i - 1];
      const [bx, by, bz] = edge.floor[i];
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((player.x - ax) * dx + (player.y - ay) * dy + (player.z - az) * dz) / (dx * dx + dy * dy + dz * dz || 1)));
      const distance = Math.hypot(player.x - (ax + t * dx), (player.y - (ay + t * dy)) * HEIGHT_WEIGHT, player.z - (az + t * dz));
      if (distance < best) {
        best = distance;
        found = { edge, index: i, t };
      }
    }
  }
  if (!found) return [];
  const { edge, index, t } = found;
  const a = edge.floor[index - 1], b = edge.floor[index];
  const here: Point3 = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
  // Along this gallery, which end is closer to the exit.
  let before = length3(a, here);
  for (let i = 1; i < index; i++) before += length3(edge.floor[i - 1], edge.floor[i]);
  const after = (ROUTES.lengths.get(edge.id) ?? 0) - before;
  const forward = after + ROUTES.distance[edge.to] <= before + ROUTES.distance[edge.from];
  const points: Point3[] = [here, ...(forward ? edge.floor.slice(index) : edge.floor.slice(0, index).reverse())];
  let node = forward ? edge.to : edge.from;
  let total = forward ? after : before;
  while (node !== EXIT && total < TRAIL_LENGTH) {
    const hop = ROUTES.next[node];
    if (!hop) break;
    points.push(...hop.points.slice(1));
    total += ROUTES.lengths.get(hop.edge.id) ?? 0;
    node = hop.to;
  }
  return points;
}

type Trail = {
  mesh: InstancedMesh;
  route: Point3[];
  reroutedAt: number;
  work: { matrix: Matrix4; rotation: Quaternion; direction: Vector3; scale: Vector3; at: Vector3 };
};

function createTrail(): Trail {
  const material = new MeshBasicMaterial({ color: '#7fe3ff', transparent: true, opacity: 0.92, depthWrite: false, side: DoubleSide, toneMapped: false });
  const mesh = new InstancedMesh(chevronGeometry(0.38), material, MAX_ARROWS);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return {
    mesh,
    route: [],
    reroutedAt: -Infinity,
    work: { matrix: new Matrix4(), rotation: new Quaternion(), direction: new Vector3(), scale: new Vector3(), at: new Vector3() },
  };
}

// One frame: arrows every SPACING meters along the route, each pointing along its stretch.
function updateTrail(trail: Trail, player: Vector3, time: number) {
  if (time - trail.reroutedAt > REROUTE_SECONDS) {
    trail.reroutedAt = time;
    trail.route = routeFrom(player);
  }
  const { mesh, route, work } = trail;
  let count = 0;
  let travelled = 0;
  let nextArrow = FIRST_ARROW;
  for (let i = 1; i < route.length && count < MAX_ARROWS; i++) {
    const a = route[i - 1], b = route[i];
    const length = length3(a, b);
    if (length < 1e-3) continue;
    work.direction.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).divideScalar(length);
    work.rotation.setFromUnitVectors(FORWARD, work.direction);
    while (nextArrow <= travelled + length && count < MAX_ARROWS) {
      const along = nextArrow - travelled;
      const crest = Math.max(0, Math.sin(((nextArrow - time * WAVE_SPEED) / WAVE_LENGTH) * Math.PI * 2));
      work.scale.setScalar(0.85 + 0.4 * crest);
      work.at.set(a[0] + work.direction.x * along, a[1] + work.direction.y * along + HOVER, a[2] + work.direction.z * along);
      mesh.setMatrixAt(count++, work.matrix.compose(work.at, work.rotation, work.scale));
      nextArrow += SPACING;
    }
    travelled += length;
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
}

// The compass in the maze: while it is out (backpack) and the player is inside the tunnels, a trail of glowing blue
// arrows on the floor leads from wherever they stand to the summit exit, so every junction shows the right gallery.
export function BrujulaGuia() {
  const inTunnels = useVisibleFrom(VISIBLE_FROM.tunelesObjetos);
  const activa = useTunelStore((state) => state.brujulaActiva);
  const owned = useProgressStore((state) => getItemState('brujula', state.progress) === 'owned');
  return inTunnels && activa && owned ? <Sendero /> : null;
}

function Sendero() {
  const [trail] = useState(createTrail);
  useEffect(
    () => () => {
      trail.mesh.dispose();
      trail.mesh.geometry.dispose();
      (trail.mesh.material as MeshBasicMaterial).dispose();
    },
    [trail],
  );
  useFrame((state) => updateTrail(trail, usePlayerStore.getState().position, state.clock.elapsedTime));
  return <primitive object={trail.mesh} />;
}
