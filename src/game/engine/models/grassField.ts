import { BufferGeometry, Float32BufferAttribute, Vector3, type Mesh, type Object3D } from 'three';

// Grass over a terrain: where each tuft goes is worked out once from the terrain's own triangles (so tufts follow the
// ground exactly and none floats), kept by cell of the map, and only the ones around the camera are drawn (see Pasto).

// A tuft: where its foot is, how big it is, how it is turned, how bright it is (its tint) and a number of its own
// between 0 and 1 (which tufts stay when they are thinned out far away).
export const TUFT_FLOATS = 7; // x, y, z, size, turn, tint, pick
export type GrassField = { cellSize: number; cells: Map<string, Float32Array>; count: number };

// How many tufts per square meter a piece of ground gets and how bright they are (0 = none), from its masks (the
// terrain's second set of vertex colours: mud, path, forest floor), the height of its middle and where it is.
export type GrassRule = (mask: { r: number; g: number; b: number; a: number }, x: number, y: number, z: number) => { density: number; tint: number };

// Small pseudo-random generator (mulberry32): the same grass every time the game loads.
function random(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// Scatters tufts over the triangles of the terrain that are flat enough (`minUp`: least y of their normal), as many
// as `rule` says for each.
export function scatterGrass(terrain: Object3D, rule: GrassRule, { cellSize = 16, minUp = 0.82, maskAttribute = 'color_1' } = {}): GrassField {
  terrain.updateMatrixWorld(true);
  const lists = new Map<string, number[]>();
  const next = random(20261114);
  let count = 0;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const ab = new Vector3();
  const ac = new Vector3();
  const normal = new Vector3();
  terrain.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const { position } = mesh.geometry.attributes;
    const mask = mesh.geometry.getAttribute(maskAttribute);
    const index = mesh.geometry.index;
    if (!mask) return;
    const corners = index ? index.count : position.count;
    const at = (i: number) => (index ? index.getX(i) : i);
    for (let i = 0; i < corners; i += 3) {
      const ia = at(i), ib = at(i + 1), ic = at(i + 2);
      a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
      normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a));
      const area = normal.length() / 2;
      if (area < 1e-6 || Math.abs(normal.y) / (area * 2) < minUp) continue;
      const m = {
        r: (mask.getX(ia) + mask.getX(ib) + mask.getX(ic)) / 3,
        g: (mask.getY(ia) + mask.getY(ib) + mask.getY(ic)) / 3,
        b: (mask.getZ(ia) + mask.getZ(ib) + mask.getZ(ic)) / 3,
        a: mask.itemSize > 3 ? (mask.getW(ia) + mask.getW(ib) + mask.getW(ic)) / 3 : 1,
      };
      const { density, tint } = rule(m, (a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3);
      if (density <= 0) continue;
      const wanted = area * density;
      const tufts = Math.floor(wanted) + (next() < wanted % 1 ? 1 : 0);
      for (let t = 0; t < tufts; t++) {
        // A point anywhere on the triangle.
        let u = next();
        let v = next();
        if (u + v > 1) [u, v] = [1 - u, 1 - v];
        const x = a.x + ab.x * u + ac.x * v;
        const y = a.y + ab.y * u + ac.y * v;
        const z = a.z + ab.z * u + ac.z * v;
        const key = `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
        let list = lists.get(key);
        if (!list) lists.set(key, (list = []));
        list.push(x, y, z, 0.75 + next() * 0.6, next() * Math.PI * 2, tint * (0.82 + next() * 0.36), next());
        count++;
      }
    }
  });
  const cells = new Map<string, Float32Array>();
  lists.forEach((list, key) => cells.set(key, new Float32Array(list)));
  return { cellSize, cells, count };
}

// One tuft: `blades` thin blades fanning out from a point, each a strip that narrows to its tip and leans outward.
// Their normals point up, so a tuft takes the light like the ground it grows on; uv.y is 0 at the foot and 1 at the
// tip (the grass material paints and bends them by it).
export function tuftGeometry({ blades = 5, height = 0.3, width = 0.035, spread = 0.13 } = {}): BufferGeometry {
  const next = random(7);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2 + next() * 0.9;
    const out = { x: Math.cos(angle), z: Math.sin(angle) };
    const side = { x: -out.z, z: out.x };
    const foot = spread * (0.25 + next() * 0.75);
    const tall = height * (0.65 + next() * 0.6);
    const lean = tall * (0.25 + next() * 0.35);
    const first = positions.length / 3;
    // Foot and middle (two corners each), then the tip.
    for (const [t, w] of [[0, 1], [0.55, 0.62]] as const) {
      const along = foot + lean * t * t;
      for (const s of [-1, 1]) {
        positions.push(out.x * along + side.x * width * w * s, tall * t - 0.02, out.z * along + side.z * width * w * s);
        uvs.push(s < 0 ? 0 : 1, t);
      }
    }
    positions.push(out.x * (foot + lean), tall, out.z * (foot + lean));
    uvs.push(0.5, 1);
    indices.push(first, first + 1, first + 3, first, first + 3, first + 2, first + 2, first + 3, first + 4);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(positions.flatMap((_, i) => (i % 3 === 1 ? [1] : [0])), 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
