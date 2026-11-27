import { AdditiveBlending, SphereGeometry } from 'three';
import { float, normalView, positionViewDirection, positionWorld, sin, time, vec3 } from 'three/tsl';
import { MeshBasicNodeMaterial } from 'three/webgpu';

// The glow of what can be picked up: a soft ball of golden light around the item, brighter through its middle, that
// breathes and shimmers, so it is seen from across the room. Written in TSL: three compiles it to WGSL (WebGPU) or to
// GLSL (WebGL 2), so it looks the same on both. One material and one geometry for every item.

const GOLD = vec3(1, 0.82, 0.3);

function pickupGlowMaterial() {
  const material = new MeshBasicNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.blending = AdditiveBlending;
  material.fog = false;
  material.toneMapped = false;
  // Bright where the ball faces the camera, gone at its rim: a halo, not a shell.
  const facing = normalView.dot(positionViewDirection).abs();
  // Each item breathes at its own moment (by where it lies), and a quick shimmer runs up through it.
  const phase = positionWorld.x.mul(1.7).add(positionWorld.z.mul(2.3));
  const breathe = sin(time.mul(2.6).add(phase)).mul(0.3).add(0.7);
  const shimmer = sin(positionWorld.y.mul(22).sub(time.mul(5))).mul(0.12).add(0.88);
  material.colorNode = GOLD;
  material.opacityNode = facing.pow(2.2).mul(breathe).mul(shimmer).mul(float(0.06));
  return material;
}

export const PICKUP_GLOW = { geometry: new SphereGeometry(1, 24, 16), material: pickupGlowMaterial() };
