import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D, type Camera } from 'three';
import { scatterGrass, tuftGeometry, TUFT_FLOATS, type GrassField, type GrassRule } from '@/game/engine/models/grassField';
import { grassMaterial } from '@/game/engine/rendering/vegetation';
import { MAPA_MODELS } from '@/game/world/assets';
import { useInterior, useRegion } from '@/game/world/visibility';

// Tufts are drawn up to FAR meters from the camera, so the ground is never seen bare and then suddenly covered: the
// grass is already there when a place comes into view, and at FAR it sinks into the ground over the last FADE meters
// (lost in the fog). Up to NEAR every tuft is drawn; beyond it only a share of them, fewer the farther (down to THIN
// of them at FAR), each one bigger to cover for the ones left out (up to FAR_SIZE times). A tuft does not pop in when
// its turn comes: it grows over GROW of that share. At most MAX at a time; they are chosen again every time the
// camera has moved MOVED meters.
const FAR = 150;
const FADE = 30;
const NEAR = 24;
const THIN = 0.14;
const FAR_SIZE = 2.2;
const GROW = 0.12;
const MAX = 14000;
const MOVED = 6;
// Tufts per square meter of open ground.
const DENSITY = 2;
// Above this height everything is snow and bare rock (the summit and the mountains around it).
const SNOW_LINE = 46;

// Where grass grows, by the terrain's masks (r mud, g trodden path, b forest floor, a under 1 on the stony slopes):
// none on the mud of the swamp (reeds grow there) nor on the paths and the village ground; sparse and dark under the
// trees of the forest; thinner on the slopes; none above the snow line.
const rule: GrassRule = (mask, _x, y) => {
  if (y > SNOW_LINE || mask.r > 0.3) return { density: 0, tint: 1 };
  const offPath = 1 - Math.min(1, mask.g * 1.7);
  if (offPath < 0.08) return { density: 0, tint: 1 };
  if (mask.b > 0.5) return { density: DENSITY * 0.4 * offPath, tint: 0.5 };
  return { density: DENSITY * offPath * (mask.a < 0.9 ? 0.55 : 1), tint: 1 };
};

// Withered straw in the desolate world, fresh green once the world has recovered (foot and tip of each blade).
const MATERIAL = grassMaterial({ dry: ['#4a3f24', '#b89f63'], green: ['#1f4a17', '#7cc043'], far: FAR, fade: FADE, bend: 0.04 });

const DUMMY = new Object3D();
const TINT = new Color();

// Puts in `mesh` the tufts of `field` around the camera: all the near ones and a share of the far ones. The cells
// nearest to the camera go first, so if there were ever more tufts than fit, the ones left out would be the farthest.
function fill(mesh: InstancedMesh, field: GrassField, camera: Camera) {
  const { cellSize, cells } = field;
  const cx = camera.position.x;
  const cz = camera.position.z;
  let count = 0;
  const near: { tufts: Float32Array; distance: number }[] = [];
  for (let i = Math.floor((cx - FAR) / cellSize); i <= Math.floor((cx + FAR) / cellSize); i++) {
    for (let j = Math.floor((cz - FAR) / cellSize); j <= Math.floor((cz + FAR) / cellSize); j++) {
      const tufts = cells.get(`${i},${j}`);
      if (tufts) near.push({ tufts, distance: Math.hypot((i + 0.5) * cellSize - cx, (j + 0.5) * cellSize - cz) });
    }
  }
  near.sort((a, b) => a.distance - b.distance);
  {
    for (const { tufts } of near) {
      for (let t = 0; t < tufts.length && count < MAX; t += TUFT_FLOATS) {
        const distance = Math.hypot(tufts[t] - cx, tufts[t + 2] - cz);
        if (distance > FAR) continue;
        // The share of tufts drawn at this distance, and how far into it this one is (it grows as it comes in).
        const away = Math.max(0, (distance - NEAR) / (FAR - NEAR));
        const share = 1 - away * (1 - THIN);
        const turn = (share - tufts[t + 6]) / GROW;
        if (turn <= 0) continue;
        DUMMY.position.set(tufts[t], tufts[t + 1], tufts[t + 2]);
        DUMMY.rotation.set(0, tufts[t + 4], 0);
        DUMMY.scale.setScalar(tufts[t + 3] * Math.min(1, turn) * (1 + away * (FAR_SIZE - 1)));
        DUMMY.updateMatrix();
        mesh.setMatrixAt(count, DUMMY.matrix);
        mesh.setColorAt(count, TINT.setScalar(tufts[t + 5]));
        count++;
      }
    }
  }
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
}

// Short grass all over the open ground of the map, so it is not bare: tufts of a few blades that bend with the wind.
// Where each one grows is worked out once from the terrain (grassField.ts); a single instanced mesh draws the few
// thousand in view around the camera, out to the fog, in one draw call. Not drawn indoors, in the tunnels nor on the summit, where none grows.
export function Pasto() {
  const { scene } = useGLTF(MAPA_MODELS.terreno);
  const field = useMemo(() => scatterGrass(scene, rule), [scene]);
  const mesh = useMemo(() => {
    const tufts = new InstancedMesh(tuftGeometry({ height: 0.17, width: 0.02, spread: 0.08 }), MATERIAL, MAX);
    tufts.setColorAt(0, TINT.setScalar(1));
    tufts.count = 0;
    tufts.frustumCulled = false; // they are always around the camera
    tufts.matrixAutoUpdate = false;
    return tufts;
  }, []);
  const region = useRegion();
  const indoors = useInterior() !== null;
  const shown = !indoors && region !== 'tuneles' && region !== 'cumbre';
  const last = useRef({ x: Infinity, z: Infinity });

  useEffect(() => () => void mesh.dispose(), [mesh]);
  // A new terrain (or coming back outdoors) chooses the tufts again.
  useEffect(() => {
    last.current.x = Infinity;
  }, [field, shown]);

  useFrame(({ camera }) => {
    if (!shown) return;
    const { x, z } = camera.position;
    if (Math.hypot(x - last.current.x, z - last.current.z) < MOVED) return;
    last.current.x = x;
    last.current.z = z;
    fill(mesh, field, camera);
  });

  return <primitive object={mesh} visible={shown} />;
}
