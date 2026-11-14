import { AdditiveBlending, Color, DoubleSide, Vector2, type ColorRepresentation, type Material, type MeshStandardMaterial } from 'three';
import {
  float,
  hash,
  materialEmissive,
  materialOpacity,
  mix,
  modelWorldMatrix,
  mx_noise_float,
  normalView,
  positionGeometry,
  positionViewDirection,
  positionWorld,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec3,
  vec4,
} from 'three/tsl';
import { MeshBasicNodeMaterial, MeshStandardNodeMaterial } from 'three/webgpu';
import { swayingMaterialFor } from './vegetation';

// Everything that shines in the map (fires, lanterns, light beams, glows, gems and runes) comes from Map.blend as a
// plain emissive material: a flat colour. Here each one gets a TSL shader (WebGPU) by the name of its material, so
// flames lick and flicker, beams shimmer with soft edges and lights and gems pulse with a rim of glow.

// Flames: campfires, torches, candles.
const FIRE = /Fuego|Llama/;
// Lights that burn: lanterns, lit windows, embers.
const LANTERN = /Luz|Vidrio|Farol|Brasa/;
// Whatever else glows by itself: gems, runes, potions, glowing mushrooms and plants, magic.
const GEM = /Gema|Runa|Pocion|Liquido|Brillo|Magico|Hongo|Grabado|Helecho|FlorNoche/;

// Lights that sleep until the story wakes them (the flowers, mushrooms and runes of the fairy's clearing): the ones whose
// material name matches glow at SLEEPING of their light, and wake as a ring that spreads from `center` (world x, z) to
// `radius` meters. Whoever tells that part of the story moves the ring (a huge radius leaves them all awake).
const SLEEPER = /^Claro/;
const SLEEPING = 0.1;
export const sleepingGlow = { center: uniform(new Vector2(0, 0)), radius: uniform(1e6) };
const awake = mix(float(SLEEPING), float(1), float(1).sub(smoothstep(sleepingGlow.radius.sub(2), sleepingGlow.radius, positionWorld.xz.sub(sleepingGlow.center).length())));

// 1 where the surface faces the camera, 0 on its silhouette.
const facing = normalView.dot(positionViewDirection).abs();
// A different phase every few metres: neighbouring lights do not pulse together.
const phase = hash(positionWorld.x.div(3).floor().add(positionWorld.z.div(3).floor().mul(57))).mul(6.283);

// A flame: its mesh sways and licks upwards, yellow-white at the core and red and see-through towards the edge.
function fire() {
  const material = new MeshBasicNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.side = DoubleSide;
  // Sway (before the world position exists: from the geometry itself).
  const world = modelWorldMatrix.mul(vec4(positionGeometry, 1)).xyz;
  const lick = vec3(sin(time.mul(6.1).add(world.y.mul(11)).add(world.x.mul(7))), sin(time.mul(9.3).add(world.x.mul(13))).mul(0.6), sin(time.mul(5.2).add(world.y.mul(9)).add(world.z.mul(7))));
  material.positionNode = positionGeometry.add(lick.mul(0.035));
  // Noise that climbs the flame.
  const rise = mx_noise_float(vec3(positionWorld.x.mul(7), positionWorld.y.mul(5).sub(time.mul(3.2)), positionWorld.z.mul(7))).mul(0.5).add(0.5);
  const flicker = float(1).add(sin(time.mul(11).add(phase)).mul(0.1)).add(sin(time.mul(23).add(phase.mul(1.7))).mul(0.06));
  // Colours in linear space: red at the edges and where the flame thins, orange in its body, yellow at its heart.
  const heat = facing.mul(0.45).add(rise.mul(0.7)).sub(0.12).clamp(0, 1);
  const red = vec3(1, 0.1, 0.01);
  const orange = vec3(1, 0.32, 0.03);
  const yellow = vec3(1, 0.74, 0.2);
  material.colorNode = mix(mix(red, orange, smoothstep(0, 0.5, heat)), yellow, smoothstep(0.55, 1, heat)).mul(flicker);
  material.opacityNode = smoothstep(0.02, 0.6, facing).mul(rise.mul(0.3).add(0.7));
  return material;
}

// A beam or a halo of light (see-through): soft at the edges, with streaks of light that climb and shimmer.
function beam(old: MeshStandardMaterial) {
  const material = new MeshBasicNodeMaterial();
  material.opacity = old.opacity;
  material.transparent = true;
  material.depthWrite = false;
  material.side = DoubleSide;
  // Its gradient texture fades it out along its length.
  const alpha = old.map ? texture(old.map, uv()).a : float(1);
  // As bright as Map.blend made it (emissive strength), short of burning out to white: the light keeps its colour.
  const strength = Math.min(old.emissiveIntensity, 2.6);
  const emissive = vec3(old.emissive.r * strength, old.emissive.g * strength, old.emissive.b * strength);
  const tint = old.emissiveMap ? texture(old.emissiveMap, uv()).rgb.mul(emissive) : emissive;
  const streaks = mx_noise_float(vec3(positionWorld.x.mul(1.6), positionWorld.y.mul(0.35).sub(time.mul(0.9)), positionWorld.z.mul(1.6))).mul(0.5).add(0.5);
  const shimmer = sin(positionWorld.y.mul(1.4).sub(time.mul(2.4)).add(streaks.mul(4))).mul(0.18).add(0.92);
  material.colorNode = vec4(tint.mul(streaks.mul(0.6).add(0.8)).mul(shimmer), alpha);
  // Flat rays and halos are often seen edge-on: the edge softens, it never disappears.
  material.opacityNode = materialOpacity.mul(mix(float(0.55), float(1), facing.pow(1.2))).mul(streaks.mul(0.35).add(0.8));
  return material;
}

// A lit surface (lantern glass, ember, gem, rune): its light pulses, and a rim of glow rounds its silhouette.
function pulsing(old: MeshStandardMaterial, { speed, amount, rim }: { speed: number; amount: number; rim: number }) {
  const material = new MeshStandardNodeMaterial();
  material.color.copy(old.color);
  material.map = old.map;
  material.roughness = old.roughness;
  material.metalness = old.metalness;
  material.roughnessMap = old.roughnessMap;
  material.metalnessMap = old.metalnessMap;
  material.normalMap = old.normalMap;
  material.emissive.copy(old.emissive);
  material.emissiveMap = old.emissiveMap;
  material.emissiveIntensity = old.emissiveIntensity;
  material.transparent = old.transparent;
  material.opacity = old.opacity;
  material.alphaTest = old.alphaTest;
  material.side = old.side;
  material.vertexColors = old.vertexColors;
  material.flatShading = old.flatShading;
  const pulse = float(1).add(sin(time.mul(speed).add(phase)).mul(amount)).add(sin(time.mul(speed * 2.7).add(phase.mul(1.7))).mul(amount * 0.4));
  const halo = float(1).sub(facing).pow(2).mul(rim);
  const light = materialEmissive.mul(pulse.add(halo));
  material.emissiveNode = SLEEPER.test(old.name) ? light.mul(awake) : light;
  return material;
}

// A ball of light with no surface (a fairy's glow, a will-o'-the-wisp), for a sphere: white-hot at its heart, its
// colour around it and fading to nothing toward its silhouette, so it has no edge from wherever it is seen. It
// breathes and twinkles by itself, and adds its light to what is behind it. Scale its mesh to make it brighter or
// dimmer.
export function lightOrb(color: ColorRepresentation, heart: ColorRepresentation = '#ffffff') {
  const material = new MeshBasicNodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.blending = AdditiveBlending;
  material.toneMapped = false;
  // Colours in linear space, as the shader works.
  const halo = new Color(color);
  const core = new Color(heart);
  const breathe = float(1).add(sin(time.mul(2.3)).mul(0.1)).add(sin(time.mul(7.9)).mul(0.05));
  const twinkle = float(1).add(sin(time.mul(23)).mul(sin(time.mul(3.1))).mul(0.08));
  // 1 at the middle of the ball, 0 at its silhouette: a small bright heart inside a wide soft halo.
  const heartAt = smoothstep(0.82, 1, facing);
  material.colorNode = mix(vec3(halo.r, halo.g, halo.b), vec3(core.r, core.g, core.b), heartAt).mul(breathe);
  material.opacityNode = facing.pow(3).mul(0.55).add(heartAt.mul(0.45)).mul(breathe).mul(twinkle);
  return material;
}

const upgraded = new WeakMap<Material, Material | null>();

// The shader version of a material from Map.blend that shines, or null when it is not one of them. One per material:
// every mesh that shared the original shares its replacement.
export function glowMaterialFor(material: Material): Material | null {
  const known = upgraded.get(material);
  if (known !== undefined) return known;
  let next: Material | null = null;
  const old = material as MeshStandardMaterial;
  if (old.isMeshStandardMaterial && !(material as { isNodeMaterial?: boolean }).isNodeMaterial) {
    const lit = old.emissive.r + old.emissive.g + old.emissive.b > 0.01;
    // Plants that sway in the wind get their own shader (vegetation.ts).
    const plant = swayingMaterialFor(old);
    if (plant) next = plant;
    else if (FIRE.test(old.name)) next = fire();
    else if (!lit) next = null;
    else if (old.transparent && (LANTERN.test(old.name) || GEM.test(old.name))) next = beam(old);
    else if (LANTERN.test(old.name)) next = pulsing(old, { speed: 3.1, amount: 0.16, rim: 0.7 });
    else if (GEM.test(old.name)) next = pulsing(old, { speed: 1.7, amount: 0.3, rim: 1.6 });
    if (next) {
      next.name = old.name;
      next.visible = old.visible;
      upgraded.set(next, null);
    }
  }
  upgraded.set(material, next);
  return next;
}
