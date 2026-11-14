import { BOSQUE_POLYGON } from '@/game/world/geography';
import { tocaUnArbol } from '../bosqueOscuridad/obstaculos';
import { SENDERO_BOSQUE } from './senderoBosque';

// The way out of the Dark Forest from wherever the player stands, found with A* on a grid of the forest floor: it goes
// around the trunks, keeps off ground too steep to walk and prefers ground away from both.

type Point3 = readonly [number, number, number];
type TerrainHeight = (x: number, z: number, fromY: number, maxDrop: number) => number | null;

// Side of a cell of the grid (m).
const CELL = 1.5;
// The route keeps this far from every trunk (m).
const CLEAR = 1.1;
// Steepest ground the route climbs (rise over run between two cells).
const MAX_SLOPE = 0.6;
// Walking next to a trunk or a steep bank costs this many extra metres per cell, so the route stays in the open.
const NEAR_BLOCKED_COST = 3;
// The terrain is looked for from this height down (over every peak of the forest).
const SKY = 140;
const DROP = 220;

// Where the forest ends: the last point of the hand-laid trail, on the road to Hedrig's town.
const EXIT = SENDERO_BOSQUE[SENDERO_BOSQUE.length - 1];

type Grid = { x0: number; z0: number; columns: number; rows: number; height: Float32Array; blocked: Uint8Array; near: Uint8Array };

let grid: Grid | null = null;

// The forest floor as cells: its height, whether a trunk stands there and whether one stands next to it. Measured once
// (the terrain and the trees do not change), the first time a route is asked for.
function measure(terrainHeight: TerrainHeight): Grid | null {
  const points = [...BOSQUE_POLYGON, ...SENDERO_BOSQUE.map(([x, , z]) => [x, z] as const)];
  const x0 = Math.min(...points.map(([x]) => x)) - 6;
  const z0 = Math.min(...points.map(([, z]) => z)) - 6;
  const columns = Math.ceil((Math.max(...points.map(([x]) => x)) + 6 - x0) / CELL);
  const rows = Math.ceil((Math.max(...points.map(([, z]) => z)) + 6 - z0) / CELL);
  const height = new Float32Array(columns * rows);
  const blocked = new Uint8Array(columns * rows);
  let found = 0;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const x = x0 + (column + 0.5) * CELL;
      const z = z0 + (row + 0.5) * CELL;
      const ground = terrainHeight(x, z, SKY, DROP);
      const i = row * columns + column;
      if (ground === null) blocked[i] = 1;
      else {
        found++;
        height[i] = ground;
        if (tocaUnArbol(x, ground, z, CLEAR)) blocked[i] = 1;
      }
    }
  }
  // The terrain collider is not there yet: nothing to walk on.
  if (found === 0) return null;
  const near = new Uint8Array(columns * rows);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const i = row * columns + column;
      if (blocked[i]) continue;
      for (const [dc, dr] of STEPS) {
        const c = column + dc;
        const r = row + dr;
        if (c < 0 || r < 0 || c >= columns || r >= rows) continue;
        const j = r * columns + c;
        if (blocked[j] || Math.abs(height[j] - height[i]) > MAX_SLOPE * CELL * Math.hypot(dc, dr)) near[i] = 1;
      }
    }
  }
  return { x0, z0, columns, rows, height, blocked, near };
}

const STEPS: readonly (readonly [number, number])[] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
];

// The free cell nearest to a point (the point may be against a trunk or just off the grid).
function cellAt({ x0, z0, columns, rows, blocked }: Grid, x: number, z: number): number | null {
  const column = Math.min(columns - 1, Math.max(0, Math.floor((x - x0) / CELL)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor((z - z0) / CELL)));
  for (let reach = 0; reach <= 6; reach++) {
    let best: number | null = null;
    let bestDistance = Infinity;
    for (let r = Math.max(0, row - reach); r <= Math.min(rows - 1, row + reach); r++) {
      for (let c = Math.max(0, column - reach); c <= Math.min(columns - 1, column + reach); c++) {
        if (blocked[r * columns + c]) continue;
        const distance = Math.hypot(c - column, r - row);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = r * columns + c;
        }
      }
    }
    if (best !== null) return best;
  }
  return null;
}

// A binary heap of cells by their estimated total cost.
function pushHeap(heap: number[], score: Float32Array, cell: number) {
  let i = heap.push(cell) - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (score[heap[parent]] <= score[cell]) break;
    heap[i] = heap[parent];
    i = parent;
  }
  heap[i] = cell;
}

function popHeap(heap: number[], score: Float32Array): number {
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    let i = 0;
    for (;;) {
      let child = i * 2 + 1;
      if (child >= heap.length) break;
      if (child + 1 < heap.length && score[heap[child + 1]] < score[heap[child]]) child++;
      if (score[heap[child]] >= score[last]) break;
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = last;
  }
  return top;
}

// The route from (x, z) to the forest exit as points on the ground (world x, y, z), or null when there is none (the
// terrain is not loaded yet, or the player is somewhere closed off): the caller falls back on the hand-laid trail.
export function rutaALaSalida(x: number, z: number, terrainHeight: TerrainHeight): Point3[] | null {
  grid ??= measure(terrainHeight);
  if (!grid) return null;
  const { x0, z0, columns, rows, height, blocked, near } = grid;
  const start = cellAt(grid, x, z);
  const goal = cellAt(grid, EXIT[0], EXIT[2]);
  if (start === null || goal === null) return null;
  const goalColumn = goal % columns;
  const goalRow = Math.floor(goal / columns);

  const cost = new Float32Array(columns * rows).fill(Infinity);
  const score = new Float32Array(columns * rows).fill(Infinity);
  const from = new Int32Array(columns * rows).fill(-1);
  const closed = new Uint8Array(columns * rows);
  const heap: number[] = [];
  cost[start] = 0;
  score[start] = 0;
  pushHeap(heap, score, start);
  let reached = false;
  while (heap.length > 0) {
    const current = popHeap(heap, score);
    if (closed[current]) continue;
    closed[current] = 1;
    if (current === goal) {
      reached = true;
      break;
    }
    const column = current % columns;
    const row = Math.floor(current / columns);
    for (const [dc, dr] of STEPS) {
      const c = column + dc;
      const r = row + dr;
      if (c < 0 || r < 0 || c >= columns || r >= rows) continue;
      const next = r * columns + c;
      if (blocked[next] || closed[next]) continue;
      // A diagonal step does not cut the corner of a trunk.
      if (dc !== 0 && dr !== 0 && (blocked[row * columns + c] || blocked[r * columns + column])) continue;
      const run = CELL * Math.hypot(dc, dr);
      const rise = Math.abs(height[next] - height[current]);
      if (rise > MAX_SLOPE * run) continue;
      const total = cost[current] + run + rise + (near[next] ? NEAR_BLOCKED_COST : 0);
      if (total >= cost[next]) continue;
      cost[next] = total;
      from[next] = current;
      score[next] = total + CELL * Math.hypot(c - goalColumn, r - goalRow);
      pushHeap(heap, score, next);
    }
  }
  if (!reached) return null;

  const route: Point3[] = [];
  for (let cell = goal; cell !== -1; cell = from[cell]) {
    route.push([x0 + ((cell % columns) + 0.5) * CELL, height[cell], z0 + (Math.floor(cell / columns) + 0.5) * CELL]);
  }
  return route.reverse();
}
