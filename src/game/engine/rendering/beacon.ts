import { DoubleSide } from 'three';
import { float, mx_noise_float, normalView, positionViewDirection, positionWorld, sin, time, uniform, uv, vec3 } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

// A column of golden light that marks a place from far away. Written in TSL: three compiles it to WGSL (WebGPU) or to
// GLSL (WebGL 2), so it looks the same on both.

// How much of the light shows (0 none, 1 all): the beacon fades out as the player reaches it.
export const beaconStrength = uniform(1);

// Warm gold, bright enough to read against the pale sky and against the dark of the trees alike.
const GOLD = vec3(1, 0.8, 0.24);

// `core`: the thin bright heart of the column; without it, the wide soft glow around it.
export function beaconMaterial(core: boolean) {
  const material = new MeshBasicNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.side = DoubleSide;
  // The mist of the world does not dim it and it keeps its colour: it has to be seen from the other side of the map.
  material.fog = false;
  material.toneMapped = false;
  // 0 at the ground, 1 at the top of the column (a cylinder's own UV).
  const height = uv().y;
  // Strong near the ground, gone at the top.
  const fade = float(1).sub(height).pow(core ? 1.3 : 2.2);
  // Bright through the middle of the column, soft at its edges.
  const facing = normalView.dot(positionViewDirection).abs();
  // Streaks of light that climb, and a slow breath.
  const streaks = mx_noise_float(vec3(positionWorld.x.mul(1.3), positionWorld.y.mul(0.22).sub(time.mul(1.6)), positionWorld.z.mul(1.3))).mul(0.5).add(0.5);
  const breathe = sin(time.mul(2.1)).mul(0.12).add(0.88);
  material.colorNode = GOLD.mul(streaks.mul(0.35).add(core ? 0.95 : 0.8));
  material.opacityNode = beaconStrength
    .mul(fade)
    .mul(facing.pow(core ? 1.2 : 2.4))
    .mul(streaks.mul(0.4).add(0.7))
    .mul(breathe)
    .mul(core ? 0.9 : 0.4);
  return material;
}
