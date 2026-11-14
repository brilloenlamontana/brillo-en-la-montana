// Builds the physics of the Summit tunnels (Challenge 3) from the models themselves. Run: npm run tuneles:fisica
//
// The only thing modelled by hand is the floor: the mesh TunelSueloColision of TunelesColision.glb (Map.blend), which
// covers exactly what can be walked. Everything else is derived here, so the tunnels are sealed by construction:
//   - walls: along every edge of that floor, simplified into as few boxes as the shape allows;
//   - blocks: one box for each small thing standing in the middle of a gallery (posts, rocks);
//   - patches: a thin floor box over each slit nothing stands in (the gaps between the planks of the bridge);
//   - openings: where the floor meets the outdoor terrain (the mine mouth and the exit pit) no wall is built.
// It writes src/game/challenges/desafio3/tunelesCumbre/tunelColliderData.ts and fails, writing nothing, if any edge
// would be left open or an opening shows up anywhere but at the two mouths.
//
// To optimise the tunnels' physics: edit the floor mesh in Blender (fewer, larger faces cost nothing in quality: the
// walls only follow its outline), export TunelesColision.glb, run this script and read its report.

import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Matrix4, Quaternion, Vector3 } from 'three';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAP = resolve(ROOT, 'public/models-3d/map');
const FLOOR_GLB = resolve(MAP, 'Desafio3/TunelesCumbre/TunelesColision.glb');
const FLOOR_NODE = 'TunelSueloColision';
const VISUAL_GLBS = ['Desafio3/TunelesCumbre/TunelesEstructura.glb', 'Desafio3/TunelesCumbre/TunelesObjetos.glb'].map((file) => resolve(MAP, file));
const TERRAIN_GLB = resolve(MAP, 'Mapa/Terreno/Terreno.glb');
const OUTPUT = resolve(ROOT, 'src/game/challenges/desafio3/tunelesCumbre/tunelColliderData.ts');

// ---- Knobs (metres) -------------------------------------------------------------------------------------------------
// A wall may stray this far from the true edge of the floor: larger means fewer boxes and smoother sliding along walls.
const WALL_TOLERANCE = 0.3;
// Walls start a little under the floor and end out of reach of a jump.
const WALL_FOOT = 0.5;
const WALL_HEIGHT = 3.4;
// A floor this far above a wall belongs to another gallery: the wall stops under it.
const OTHER_LEVEL = 2;
// Something standing in a gallery that fits in a square of this side becomes one box instead of a ring of walls.
const BLOCK_MAX_SIDE = 1.2;
// A gap in the floor this narrow with nothing standing in it is a slit: it is covered with floor instead of being walled.
const SLIT_MAX_WIDTH = 0.45;
const PATCH_HALF_THICKNESS = 0.08;
// "Standing in it": any drawn geometry between these heights over the floor.
const STANDING = [0.35, 1.6];
// The floor meets the terrain (an opening) when the ground just outside the edge is within this band of its height.
const TERRAIN_BAND = [-0.8, 0.6];
const TERRAIN_REACH = [0.3, 0.6, 1, 1.5];
// The only places an opening may appear, and must appear: [x, y, z] of each mouth and how far around it.
const MOUTHS = [
  { name: 'entrada (boca de la mina)', at: [105.02, 24.16, -186.64], radius: 4.5 },
  { name: 'salida (pozo de la Cumbre)', at: [106.75, 51.75, -164.7], radius: 4.5 },
];

// ---- Reading GLB ----------------------------------------------------------------------------------------------------
const draco = await createRequire(import.meta.url)('draco3d').createDecoderModule({});

// Every mesh of a GLB in world coordinates: [{ name, positions: Float32Array, indices: Uint32Array }].
function readGlb(file) {
  const buffer = readFileSync(file);
  const jsonLength = buffer.readUInt32LE(12);
  const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString());
  const bin = buffer.subarray(20 + jsonLength + 8);
  const decoder = new draco.Decoder();
  const meshes = [];

  const visit = (index, parent) => {
    const node = json.nodes[index];
    const local = node.matrix
      ? new Matrix4().fromArray(node.matrix)
      : new Matrix4().compose(
          new Vector3(...(node.translation ?? [0, 0, 0])),
          new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
          new Vector3(...(node.scale ?? [1, 1, 1])),
        );
    const world = parent.clone().multiply(local);
    if (node.mesh !== undefined) {
      for (const primitive of json.meshes[node.mesh].primitives) {
        const compressed = primitive.extensions?.KHR_draco_mesh_compression;
        if (!compressed) throw new Error(`${file}: ${node.name} is not Draco-compressed`);
        const view = json.bufferViews[compressed.bufferView];
        const data = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
        const mesh = new draco.Mesh();
        if (!decoder.DecodeArrayToMesh(new Int8Array(data), data.length, mesh).ok()) throw new Error(`${file}: cannot decode ${node.name}`);
        const points = mesh.num_points();
        const faces = mesh.num_faces();
        const raw = new draco.DracoFloat32Array();
        decoder.GetAttributeFloatForAllPoints(mesh, decoder.GetAttributeByUniqueId(mesh, compressed.attributes.POSITION), raw);
        const positions = new Float32Array(points * 3);
        const point = new Vector3();
        for (let i = 0; i < points; i++) {
          point.set(raw.GetValue(i * 3), raw.GetValue(i * 3 + 1), raw.GetValue(i * 3 + 2)).applyMatrix4(world);
          positions.set([point.x, point.y, point.z], i * 3);
        }
        const indices = new Uint32Array(faces * 3);
        const face = new draco.DracoInt32Array();
        for (let f = 0; f < faces; f++) {
          decoder.GetFaceFromMesh(mesh, f, face);
          for (let k = 0; k < 3; k++) indices[f * 3 + k] = face.GetValue(k);
        }
        draco.destroy(raw);
        draco.destroy(face);
        draco.destroy(mesh);
        meshes.push({ name: node.name, positions, indices });
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  };
  for (const root of json.scenes[json.scene ?? 0].nodes) visit(root, new Matrix4());
  draco.destroy(decoder);
  return meshes;
}

// ---- Floor: welded vertices and the edges only one triangle uses (its outline) --------------------------------------
const floorMesh = readGlb(FLOOR_GLB).find((mesh) => mesh.name === FLOOR_NODE);
if (!floorMesh) throw new Error(`${FLOOR_NODE} not found in ${FLOOR_GLB}`);

const vertices = []; // [x, y, z]
const weld = new Map();
const welded = new Uint32Array(floorMesh.positions.length / 3);
for (let i = 0; i < welded.length; i++) {
  const p = [...floorMesh.positions.subarray(i * 3, i * 3 + 3)];
  const key = p.map((v) => v.toFixed(3)).join(',');
  if (!weld.has(key)) weld.set(key, vertices.push(p) - 1);
  welded[i] = weld.get(key);
}
const triangleCount = floorMesh.indices.length / 3;

const uses = new Map();
for (let f = 0; f < triangleCount; f++) {
  for (let k = 0; k < 3; k++) {
    const a = welded[floorMesh.indices[f * 3 + k]];
    const b = welded[floorMesh.indices[f * 3 + ((k + 1) % 3)]];
    const c = welded[floorMesh.indices[f * 3 + ((k + 2) % 3)]];
    if (a === b) continue;
    const key = a < b ? `${a}_${b}` : `${b}_${a}`;
    const use = uses.get(key);
    if (use) use.count++;
    else uses.set(key, { a, b, c, count: 1 });
  }
}

// Outline edges, turned so the floor is to the left of a→b: the wall side is (-dz, dx), as tunelColliders.ts expects.
const edges = [];
for (const { a, b, c, count } of uses.values()) {
  if (count !== 1) continue;
  const [ax, , az] = vertices[a];
  const [bx, , bz] = vertices[b];
  const [cx, , cz] = vertices[c];
  const outX = -(bz - az);
  const outZ = bx - ax;
  const floorIsOutside = (cx - (ax + bx) / 2) * outX + (cz - (az + bz) / 2) * outZ > 0;
  edges.push(floorIsOutside ? { a: b, b: a } : { a, b });
}
for (const edge of edges) {
  const [ax, ay, az] = vertices[edge.a];
  const [bx, by, bz] = vertices[edge.b];
  const length = Math.hypot(bx - ax, bz - az);
  edge.length = length;
  edge.mid = [(ax + bx) / 2, (ay + by) / 2, (az + bz) / 2];
  edge.out = [-(bz - az) / length, (bx - ax) / length];
  edge.kind = 'wall';
}

// Loops of the outline: each edge followed by the next one leaving its end vertex.
const leaving = new Map();
edges.forEach((edge, i) => (leaving.get(edge.a) ?? leaving.set(edge.a, []).get(edge.a)).push(i));
const taken = new Uint8Array(edges.length);
const loops = [];
edges.forEach((first, start) => {
  if (taken[start]) return;
  const loop = [];
  let current = start;
  while (current !== undefined && !taken[current]) {
    taken[current] = 1;
    loop.push(current);
    current = (leaving.get(edges[current].b) ?? []).find((i) => !taken[i]);
  }
  loops.push(loop);
});

const loopInfo = loops.map((loop) => {
  let area = 0;
  let perimeter = 0;
  const box = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const i of loop) {
    const [ax, ay, az] = vertices[edges[i].a];
    const [bx, , bz] = vertices[edges[i].b];
    area += ax * bz - bx * az;
    perimeter += edges[i].length;
    box.minX = Math.min(box.minX, ax);
    box.maxX = Math.max(box.maxX, ax);
    box.minY = Math.min(box.minY, ay);
    box.maxY = Math.max(box.maxY, ay);
    box.minZ = Math.min(box.minZ, az);
    box.maxZ = Math.max(box.maxZ, az);
  }
  const closed = edges[loop.at(-1)].b === edges[loop[0]].a;
  return { loop, area, perimeter, closed, ...box, sizeX: box.maxX - box.minX, sizeZ: box.maxZ - box.minZ };
});
// The longest loop is the outer outline; loops turning the other way are holes in the floor.
const outerSign = Math.sign(loopInfo.reduce((longest, info) => (info.perimeter > longest.perimeter ? info : longest)).area);

// ---- What stands in the galleries: a grid of the cells the drawn models touch ---------------------------------------
const CELL = 0.2;
const cellKey = (x, y, z) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)},${Math.floor(z / CELL)}`;
const solid = new Set();
for (const file of VISUAL_GLBS) {
  for (const { positions, indices } of readGlb(file)) {
    for (let f = 0; f < indices.length; f += 3) {
      const a = positions.subarray(indices[f] * 3, indices[f] * 3 + 3);
      const b = positions.subarray(indices[f + 1] * 3, indices[f + 1] * 3 + 3);
      const c = positions.subarray(indices[f + 2] * 3, indices[f + 2] * 3 + 3);
      const stepsB = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / 0.12));
      const stepsC = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1], c[2] - a[2]) / 0.12));
      for (let i = 0; i <= stepsB; i++) {
        for (let k = 0; k <= stepsC; k++) {
          const u = i / stepsB;
          const v = k / stepsC;
          if (u + v > 1.0001) break;
          solid.add(cellKey(a[0] + u * (b[0] - a[0]) + v * (c[0] - a[0]), a[1] + u * (b[1] - a[1]) + v * (c[1] - a[1]), a[2] + u * (b[2] - a[2]) + v * (c[2] - a[2])));
        }
      }
    }
  }
}
const somethingStandsIn = (info) => {
  const inset = 0.08;
  for (let x = info.minX + inset; x <= info.maxX - inset + 1e-6; x += 0.1)
    for (let z = info.minZ + inset; z <= info.maxZ - inset + 1e-6; z += 0.1)
      for (let y = info.maxY + STANDING[0]; y <= info.maxY + STANDING[1]; y += 0.1) if (solid.has(cellKey(x, y, z))) return true;
  return false;
};

// ---- Terrain heights around the tunnels (to find where the floor comes out to the open) -----------------------------
const bounds = vertices.reduce(
  (box, [x, , z]) => ({ minX: Math.min(box.minX, x), maxX: Math.max(box.maxX, x), minZ: Math.min(box.minZ, z), maxZ: Math.max(box.maxZ, z) }),
  { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
);
const terrainCells = new Map();
for (const { positions, indices } of readGlb(TERRAIN_GLB)) {
  for (let f = 0; f < indices.length; f += 3) {
    const t = [0, 1, 2].map((k) => [...positions.subarray(indices[f + k] * 3, indices[f + k] * 3 + 3)]);
    const minX = Math.min(t[0][0], t[1][0], t[2][0]);
    const maxX = Math.max(t[0][0], t[1][0], t[2][0]);
    const minZ = Math.min(t[0][2], t[1][2], t[2][2]);
    const maxZ = Math.max(t[0][2], t[1][2], t[2][2]);
    if (maxX < bounds.minX - 3 || minX > bounds.maxX + 3 || maxZ < bounds.minZ - 3 || minZ > bounds.maxZ + 3) continue;
    for (let x = Math.floor(minX); x <= Math.floor(maxX); x++)
      for (let z = Math.floor(minZ); z <= Math.floor(maxZ); z++) (terrainCells.get(`${x},${z}`) ?? terrainCells.set(`${x},${z}`, []).get(`${x},${z}`)).push(t);
  }
}
// Heights of the terrain over (x, z): one per triangle the vertical line crosses.
function terrainHeights(x, z) {
  const heights = [];
  for (const [a, b, c] of terrainCells.get(`${Math.floor(x)},${Math.floor(z)}`) ?? []) {
    const det = (b[2] - c[2]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[2] - c[2]);
    if (Math.abs(det) < 1e-9) continue;
    const u = ((b[2] - c[2]) * (x - c[0]) + (c[0] - b[0]) * (z - c[2])) / det;
    const v = ((c[2] - a[2]) * (x - c[0]) + (a[0] - c[0]) * (z - c[2])) / det;
    if (u < 0 || v < 0 || u + v > 1) continue;
    heights.push(u * a[1] + v * b[1] + (1 - u - v) * c[1]);
  }
  return heights;
}

// ---- Classify every edge of the outline -----------------------------------------------------------------------------
const round = (value) => Math.round(value * 1000) / 1000;
// Drawn geometry over the point `along` metres along the edge and `outward` metres out of the floor.
const standsAt = (edge, outward, along = 0) => {
  const x = edge.mid[0] + edge.out[0] * outward + edge.out[1] * along;
  const z = edge.mid[2] + edge.out[1] * outward - edge.out[0] * along;
  for (let y = edge.mid[1] + STANDING[0]; y <= edge.mid[1] + STANDING[1]; y += 0.1) if (solid.has(cellKey(x, y, z))) return true;
  return false;
};

// 1. Openings: the ground outside is level with the floor and nothing stands on the edge.
for (const edge of edges) {
  const [x, y, z] = edge.mid;
  const meetsTerrain = TERRAIN_REACH.some((reach) =>
    terrainHeights(x + edge.out[0] * reach, z + edge.out[1] * reach).some((h) => h - y >= TERRAIN_BAND[0] && h - y <= TERRAIN_BAND[1]),
  );
  if (meetsTerrain && ![-0.2, 0, 0.2, 0.4].some((outward) => standsAt(edge, outward))) edge.kind = 'opening';
}

// 2. Blocks: a small hole in the floor with something standing in it.
const blocks = []; // [x, z, halfX, halfZ, yBottom, yTop]
for (const info of loopInfo) {
  const isHole = info.closed && Math.sign(info.area) !== outerSign;
  if (!isHole || Math.max(info.sizeX, info.sizeZ) > BLOCK_MAX_SIDE || info.loop.some((i) => edges[i].kind !== 'wall') || !somethingStandsIn(info)) continue;
  blocks.push([(info.minX + info.maxX) / 2, (info.minZ + info.maxZ) / 2, info.sizeX / 2, info.sizeZ / 2, info.minY - WALL_FOOT, info.maxY + WALL_HEIGHT].map(round));
  for (const i of info.loop) edges[i].kind = 'block';
}

// 3. Slits: two edges facing each other a step apart at the same height with nothing standing between them (the gaps
// between the planks of the bridge, a missing cell of the floor). They get floor instead of walls.
const edgeGrid = new Map();
edges.forEach((edge, i) => {
  const key = `${Math.floor(edge.mid[0])},${Math.floor(edge.mid[2])}`;
  (edgeGrid.get(key) ?? edgeGrid.set(key, []).get(key)).push(i);
});
const facing = new Map(); // edge index → { other, gap }
edges.forEach((edge, i) => {
  if (edge.kind !== 'wall') return;
  for (let gx = -1; gx <= 1; gx++) {
    for (let gz = -1; gz <= 1; gz++) {
      for (const j of edgeGrid.get(`${Math.floor(edge.mid[0]) + gx},${Math.floor(edge.mid[2]) + gz}`) ?? []) {
        const other = edges[j];
        if (j === i || other.kind !== 'wall' || edge.out[0] * other.out[0] + edge.out[1] * other.out[1] > -0.9) continue;
        const dx = other.mid[0] - edge.mid[0];
        const dz = other.mid[2] - edge.mid[2];
        const gap = dx * edge.out[0] + dz * edge.out[1];
        const aside = Math.abs(dx * edge.out[1] - dz * edge.out[0]);
        if (gap < 0.02 || gap > SLIT_MAX_WIDTH || aside > Math.max(edge.length, other.length) / 2 - 0.02 || Math.abs(other.mid[1] - edge.mid[1]) > 0.6) continue;
        if ([-0.15, 0, 0.15].some((along) => standsAt(edge, gap / 2, along))) continue;
        if (!facing.has(i) || facing.get(i).gap > gap) facing.set(i, { other: j, gap });
      }
    }
  }
});
for (const i of facing.keys()) edges[i].kind = 'patch';
// A hole that is all slit (lips joined by ends no longer than its width) needs no wall at all. Anywhere else the end
// of a slit keeps its wall, so a notch in the rock stays closed.
for (const { loop, closed } of loopInfo) {
  if (!closed || !loop.some((i) => edges[i].kind === 'patch')) continue;
  const start = loop.findIndex((i) => edges[i].kind === 'patch');
  const ordered = [...loop.slice(start), ...loop.slice(0, start), loop[start]];
  let allSlit = true;
  let run = 0;
  for (const i of ordered) {
    if (edges[i].kind === 'patch') {
      if (run > SLIT_MAX_WIDTH + 0.01) allSlit = false;
      run = 0;
    } else if (edges[i].kind === 'wall') run += edges[i].length;
    else allSlit = false;
  }
  if (allSlit) for (const i of loop) edges[i].kind = 'patch';
}

// One strip of floor per straight run of lips, from one lip to the other.
const patches = []; // [ax, ay, az, bx, by, bz, halfWidth]
const lips = [...facing.entries()]
  .filter(([i, { other }]) => i < other || !facing.has(other))
  .map(([i, { other, gap }]) => {
    const edge = edges[i];
    const tangent = [edge.out[1], -edge.out[0]];
    return {
      edge,
      gap,
      farY: edges[other].mid[1],
      line: `${edge.out.map((v) => v.toFixed(2))}|${(edge.mid[0] * edge.out[0] + edge.mid[2] * edge.out[1]).toFixed(1)}|${gap.toFixed(1)}`,
      at: edge.mid[0] * tangent[0] + edge.mid[2] * tangent[1],
    };
  })
  .sort((a, b) => a.line.localeCompare(b.line) || a.at - b.at);
for (let i = 0; i < lips.length; ) {
  let end = i + 1;
  while (end < lips.length && lips[end].line === lips[i].line && lips[end].at - lips[end - 1].at <= (lips[end].edge.length + lips[end - 1].edge.length) / 2 + 0.06) end++;
  const run = lips.slice(i, end);
  const { edge: first, gap } = run[0];
  const last = run.at(-1).edge;
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const x = (first.mid[0] + last.mid[0]) / 2;
  const z = (first.mid[2] + last.mid[2]) / 2;
  const halfWidth = Math.hypot(last.mid[0] - first.mid[0], last.mid[2] - first.mid[2]) / 2 + (first.length + last.length) / 4 + 0.05;
  patches.push([x, mean(run.map((lip) => lip.edge.mid[1])), z, x + first.out[0] * gap, mean(run.map((lip) => lip.farY)), z + first.out[1] * gap, halfWidth].map(round));
  i = end;
}

// ---- Walls: runs of wall edges, simplified ---------------------------------------------------------------------------
const distanceToSegment = (px, pz, ax, az, bx, bz) => {
  const dx = bx - ax;
  const dz = bz - az;
  const lengthSq = dx * dx + dz * dz;
  const t = lengthSq ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lengthSq)) : 0;
  return Math.hypot(px - ax - t * dx, pz - az - t * dz);
};

// Douglas–Peucker over points[from..to] (vertex ids): the indexes to keep, both ends included.
function simplify(points, from, to, keep) {
  const [ax, , az] = vertices[points[from]];
  const [bx, , bz] = vertices[points[to]];
  let worst = 0;
  let split = -1;
  for (let i = from + 1; i < to; i++) {
    const [px, , pz] = vertices[points[i]];
    const distance = distanceToSegment(px, pz, ax, az, bx, bz);
    if (distance > worst) {
      worst = distance;
      split = i;
    }
  }
  if (worst <= WALL_TOLERANCE) return;
  simplify(points, from, split, keep);
  keep.add(split);
  simplify(points, split, to, keep);
}

const walls = []; // [ax, az, bx, bz, yBottom, yTop]
function addWalls(points, closed) {
  const keep = new Set([0, points.length - 1]);
  if (closed) {
    // A ring has no ends: also keep the vertex farthest from the first one, then simplify both halves.
    let farthest = 0;
    let reach = 0;
    points.forEach((id, i) => {
      const distance = Math.hypot(vertices[id][0] - vertices[points[0]][0], vertices[id][2] - vertices[points[0]][2]);
      if (distance > reach) [reach, farthest] = [distance, i];
    });
    keep.add(farthest);
    simplify(points, 0, farthest, keep);
    simplify(points, farthest, points.length - 1, keep);
  } else simplify(points, 0, points.length - 1, keep);

  const kept = [...keep].sort((a, b) => a - b);
  for (let k = 0; k + 1 < kept.length; k++) {
    const run = points.slice(kept[k], kept[k + 1] + 1).map((id) => vertices[id]);
    const [ax, , az] = run[0];
    const [bx, , bz] = run.at(-1);
    if (Math.hypot(bx - ax, bz - az) < 1e-4) continue;
    const yMin = Math.min(...run.map((p) => p[1]));
    const yMax = Math.max(...run.map((p) => p[1]));
    walls.push({ ax, az, bx, bz, yMin, yMax });
  }
}

for (const { loop, closed } of loopInfo) {
  const isWall = (i) => edges[i].kind === 'wall';
  if (!loop.some(isWall)) continue;
  if (closed && loop.every(isWall)) {
    addWalls([...loop.map((i) => edges[i].a), edges[loop[0]].a], true);
    continue;
  }
  // Start right after an edge that is not a wall, so no run wraps around the end of the list.
  const offset = closed ? loop.findIndex((i) => !isWall(i)) + 1 : 0;
  const ordered = [...loop.slice(offset), ...loop.slice(0, offset)];
  let run = [];
  const flush = () => {
    if (run.length) addWalls([...run.map((i) => edges[i].a), edges[run.at(-1)].b], false);
    run = [];
  };
  for (const i of ordered) {
    if (isWall(i) && (!run.length || edges[run.at(-1)].b === edges[i].a)) run.push(i);
    else {
      flush();
      if (isWall(i)) run.push(i);
    }
  }
  flush();
}

// A wall stops under the floor of a gallery passing above it.
const floorGrid = new Map();
for (const [x, y, z] of vertices) (floorGrid.get(`${Math.floor(x)},${Math.floor(z)}`) ?? floorGrid.set(`${Math.floor(x)},${Math.floor(z)}`, []).get(`${Math.floor(x)},${Math.floor(z)}`)).push([x, y, z]);
let lowered = 0;
const wallRows = walls.map(({ ax, az, bx, bz, yMin, yMax }) => {
  let top = yMax + WALL_HEIGHT;
  for (let x = Math.floor(Math.min(ax, bx) - 0.6); x <= Math.floor(Math.max(ax, bx) + 0.6); x++) {
    for (let z = Math.floor(Math.min(az, bz) - 0.6); z <= Math.floor(Math.max(az, bz) + 0.6); z++) {
      for (const [px, py, pz] of floorGrid.get(`${x},${z}`) ?? []) {
        if (py > yMax + OTHER_LEVEL && py - 0.05 < top && distanceToSegment(px, pz, ax, az, bx, bz) < 0.6) top = py - 0.05;
      }
    }
  }
  if (top < yMax + WALL_HEIGHT) lowered++;
  return [ax, az, bx, bz, yMin - WALL_FOOT, top].map(round);
});

// ---- Checks ---------------------------------------------------------------------------------------------------------
const problems = [];
const describe = ([x, y, z]) => `(${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`;

// 1. Sealed: every edge that should have a wall has one within the tolerance, at its height.
let worstGap = 0;
for (const edge of edges) {
  if (edge.kind !== 'wall') continue;
  const [x, y, z] = edge.mid;
  let nearest = Infinity;
  for (const [ax, az, bx, bz, bottom, top] of wallRows) if (y >= bottom && y <= top) nearest = Math.min(nearest, distanceToSegment(x, z, ax, az, bx, bz));
  worstGap = Math.max(worstGap, nearest);
  if (nearest > WALL_TOLERANCE + 0.01) problems.push(`floor edge without a wall at ${describe(edge.mid)} (nearest wall ${nearest.toFixed(2)} m away)`);
}

// 2. Openings only at the mouths, and one at each mouth.
const openings = edges.filter((edge) => edge.kind === 'opening');
const mouthOf = (edge) => MOUTHS.find(({ at, radius }) => Math.hypot(edge.mid[0] - at[0], edge.mid[2] - at[2]) <= radius && Math.abs(edge.mid[1] - at[1]) <= 2.5);
for (const edge of openings) if (!mouthOf(edge)) problems.push(`the floor is open to the terrain away from the mouths at ${describe(edge.mid)}`);
const mouthWidths = MOUTHS.map((mouth) => openings.filter((edge) => mouthOf(edge) === mouth).reduce((sum, edge) => sum + edge.length, 0));
MOUTHS.forEach((mouth, i) => mouthWidths[i] < 1 && problems.push(`no opening found at the ${mouth.name}: the tunnels would be closed there`));

// ---- Report ---------------------------------------------------------------------------------------------------------
const outline = edges.reduce((sum, edge) => sum + edge.length, 0);
const report = [
  `Suelo: ${triangleCount} triángulos, ${vertices.length} vértices, ${outline.toFixed(0)} m de borde en ${loops.length} contornos.`,
  `Muros: ${wallRows.length} cajas (${lowered} recortadas bajo otra galería); desvío máximo del borde ${worstGap.toFixed(2)} m.`,
  `Bloques: ${blocks.length} (cosas de pie en medio de una galería).`,
  `Parches de suelo: ${patches.length} (ranuras sin nada encima).`,
  ...MOUTHS.map((mouth, i) => `Abertura ${mouth.name}: ${mouthWidths[i].toFixed(1)} m de borde sin muro.`),
  `Colisionadores en total: 1 malla de suelo + ${wallRows.length + blocks.length + patches.length} cajas.`,
];
console.log(report.join('\n'));
if (problems.length) {
  console.error(`\n${problems.length} problema(s); no se escribió nada:\n- ${problems.slice(0, 40).join('\n- ')}`);
  process.exit(1);
}

// ---- Output ---------------------------------------------------------------------------------------------------------
const rows = (list) => list.map((row) => `  [${row.join(', ')}],`).join('\n');
writeFileSync(
  OUTPUT,
  `// GENERATED by scripts/tuneles-fisica.mjs (npm run tuneles:fisica) from the floor mesh ${FLOOR_NODE} of
// TunelesColision.glb. Do not edit by hand: change the floor mesh or the knobs of the script and run it again.
// glTF coordinates (x, y, z), metres.
//
${report.map((line) => `// ${line}`).join('\n')}

// Walls along the edge of the floor (the floor is to the left of a→b): [ax, az, bx, bz, yBottom, yTop].
export const TUNEL_WALL_ROWS: readonly (readonly [number, number, number, number, number, number])[] = [
${rows(wallRows)}
];

// Things standing in the middle of a gallery, one upright box each: [x, z, halfX, halfZ, yBottom, yTop].
export const TUNEL_BLOCK_ROWS: readonly (readonly [number, number, number, number, number, number])[] = [
${rows(blocks)}
];

// Strips of floor over the slits nothing stands in, from one lip to the other: [ax, ay, az, bx, by, bz, halfWidth].
export const TUNEL_PATCH_ROWS: readonly (readonly [number, number, number, number, number, number, number])[] = [
${rows(patches)}
];

export const TUNEL_PATCH_HALF_THICKNESS = ${PATCH_HALF_THICKNESS};
`,
);
console.log(`\nEscrito ${OUTPUT}`);
