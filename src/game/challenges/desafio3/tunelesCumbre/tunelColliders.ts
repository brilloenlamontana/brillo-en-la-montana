import { segmentBox, type ColliderBox, type Point3 } from '@/game/engine/physics/colliderBoxes';
import { TUNEL_PATH } from '@/game/world/geography';

// Minimal cuboid colliders for the Summit tunnels, built along their axis (TUNEL_PATH, 2 m above the floor). Only
// what the avatar touches: the floor and the side walls. The ceiling is 4.5 m or more above the floor, out of reach of
// a jump, so it has no boxes. Measured on TunelGalerias and TunelPuente (TunelesEstructura.glb) with rays from the
// axis: the floor is always 2 m below it, the corridor walls 2.5-2.8 m to each side.

// Cross-section of the tunnel at an axis point: distance from the axis to the inner face of the walls, and their
// height above the floor.
type Section = { half: number; height: number };

const FLOOR_BELOW_AXIS = 2;
const CORRIDOR: Section = { half: 2.5, height: 4.5 };
// Wider stretches, by axis index (inclusive). The two side alcoves (indices 58 and 89-90) stay closed.
const WIDER: [from: number, to: number, section: Section][] = [
  [21, 21, { half: 4.85, height: 6 }], // entrance of the crevasse hall
  [22, 30, { half: 6.05, height: 8.5 }], // crevasse hall
  [31, 31, { half: 4.85, height: 6 }],
  [57, 60, { half: 3.3, height: 5.4 }], // landing at y 50
  [87, 90, { half: 2.9, height: 5.4 }], // landing at y 72
  [117, 117, { half: 5.4, height: 8 }], // entrance of the Ogre's chamber
  [118, 127, { half: 6.55, height: 10 }], // the Ogre's chamber
  [128, 128, { half: 4.8, height: 7 }],
  [129, 129, { half: 3.2, height: 5 }],
];

// The crevasse crosses the whole hall between these x (its bottom is 9.4 m below); the bridge spans it on the axis.
// Its deck is at floor height and its railings stand 1.07 m to each side of the axis: they become low walls, so
// nobody falls; the change of width at each end closes the hall floor along the crevasse edges.
const CREVASSE_X: [from: number, to: number] = [126.9, 131.5];
const CREVASSE_AFTER_INDEX = 25; // the crevasse starts between axis points 25 and 26 and ends between 26 and 27
const BRIDGE: Section = { half: 1.05, height: 1.4 };

// Boxes overlap a little at the joints so the capsule never catches on an edge.
const FLOOR_THICKNESS = 0.3;
const WALL_THICKNESS = 0.25;
const OVERLAP = 0.25;
// The axis is a curve sampled every ~3 m: consecutive points are merged into one box while the box strays less than
// this from them.
const TOLERANCE = 0.15;

type Node = { point: Point3; section: Section };

const sectionAt = (index: number): Section => WIDER.find(([from, to]) => index >= from && index <= to)?.[2] ?? CORRIDOR;
const sameSection = (a: Section, b: Section) => a.half === b.half && a.height === b.height;

// Point of the floor line at a given x between two axis points.
function floorAtX(a: Point3, b: Point3, x: number): Point3 {
  const t = (x - a[0]) / (b[0] - a[0]);
  return [x, a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])];
}

// Floor line (axis lowered to the floor) with the section of each stretch; the crevasse edges are inserted as nodes
// and the stretch between them is the bridge. A node's section applies to the segment that starts at it.
function floorLine(): Node[] {
  const floor = TUNEL_PATH.map(([x, y, z]): Point3 => [x, y - FLOOR_BELOW_AXIS, z]);
  const nodes: Node[] = [];
  floor.forEach((point, i) => {
    nodes.push({ point, section: sectionAt(i) });
    if (i === CREVASSE_AFTER_INDEX) {
      nodes.push({ point: floorAtX(point, floor[i + 1], CREVASSE_X[0]), section: BRIDGE });
    }
    if (i === CREVASSE_AFTER_INDEX + 1) {
      nodes[nodes.length - 1].section = BRIDGE;
      nodes.push({ point: floorAtX(point, floor[i + 1], CREVASSE_X[1]), section: sectionAt(i) });
    }
  });
  return nodes;
}

const distanceToSegment = (p: Point3, a: Point3, b: Point3) => {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / (d[0] ** 2 + d[1] ** 2 + d[2] ** 2)));
  return Math.hypot(p[0] - a[0] - t * d[0], p[1] - a[1] - t * d[1], p[2] - a[2] - t * d[2]);
};

// Douglas-Peucker: the fewest points of the run that keep every dropped point within TOLERANCE of the result.
function simplify(points: Point3[]): Point3[] {
  if (points.length < 3) return points;
  let worst = 0;
  let worstIndex = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceToSegment(points[i], points[0], points[points.length - 1]);
    if (distance > worst) [worst, worstIndex] = [distance, i];
  }
  if (worst <= TOLERANCE) return [points[0], points[points.length - 1]];
  return [...simplify(points.slice(0, worstIndex + 1)).slice(0, -1), ...simplify(points.slice(worstIndex))];
}

// Horizontal unit normal (to the left of the way) of the segment a→b.
function normal(a: Point3, b: Point3): [number, number] {
  const dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz);
  return [-dz / length, dx / length];
}

const offset = (p: Point3, [nx, nz]: [number, number], distance: number): Point3 => [p[0] + nx * distance, p[1], p[2] + nz * distance];

function runBoxes(id: string, points: Point3[], { half, height }: Section): ColliderBox[] {
  const boxes: ColliderBox[] = [];
  simplify(points).forEach((a, i, line) => {
    const b = line[i + 1];
    if (!b) return;
    const n = normal(a, b);
    boxes.push(segmentBox(`${id}-${i}-piso`, a, b, half + WALL_THICKNESS, FLOOR_THICKNESS / 2, -FLOOR_THICKNESS / 2, OVERLAP));
    for (const side of [1, -1]) {
      const wall = side * (half + WALL_THICKNESS / 2);
      boxes.push(segmentBox(`${id}-${i}-muro${side}`, offset(a, n, wall), offset(b, n, wall), WALL_THICKNESS / 2, height / 2, height / 2, OVERLAP));
    }
  });
  return boxes;
}

// Where two runs of different width meet, a wall across the way closes the gap between their walls on each side.
function capBoxes(id: string, at: Point3, before: Point3, after: Point3, a: Section, b: Section): ColliderBox[] {
  const n = normal(before, after);
  const from = Math.min(a.half, b.half);
  const to = Math.max(a.half, b.half) + WALL_THICKNESS;
  const height = Math.max(a.height, b.height);
  return [1, -1].map((side) =>
    segmentBox(`${id}${side}`, offset(at, n, side * from), offset(at, n, side * to), WALL_THICKNESS / 2, height / 2, height / 2),
  );
}

// The floor line is split into runs of equal section; each run becomes a few long boxes.
function buildTunnelBoxes(): { floors: ColliderBox[]; walls: ColliderBox[] } {
  const nodes = floorLine();
  const all: ColliderBox[] = [];
  let start = 0;
  for (let i = 1; i < nodes.length; i++) {
    const endOfRun = i === nodes.length - 1 || !sameSection(nodes[i].section, nodes[start].section);
    if (!endOfRun) continue;
    all.push(...runBoxes(`tunel-${start}`, nodes.slice(start, i + 1).map((node) => node.point), nodes[start].section));
    if (i < nodes.length - 1) {
      all.push(...capBoxes(`tunel-${i}-cierre`, nodes[i].point, nodes[i - 1].point, nodes[i + 1].point, nodes[start].section, nodes[i].section));
    }
    start = i;
  }
  return { floors: all.filter((box) => box.id.endsWith('-piso')), walls: all.filter((box) => !box.id.endsWith('-piso')) };
}

const TUNNEL = buildTunnelBoxes();

// Every box the avatar collides with in the tunnels.
export const TUNEL_COLLIDERS: readonly ColliderBox[] = [...TUNNEL.floors, ...TUNNEL.walls];
// The walls also keep the third-person camera inside the tunnel (a few boxes instead of the 27k-triangle gallery).
export const TUNEL_CAMERA_BLOCKERS: readonly ColliderBox[] = TUNNEL.walls;
