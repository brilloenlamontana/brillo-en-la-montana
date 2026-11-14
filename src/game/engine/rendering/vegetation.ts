import { Color, DoubleSide, type ColorRepresentation, type Material, type MeshStandardMaterial } from 'three';
import { cameraPosition, materialColor, mix, positionGeometry, positionLocal, sin, smoothstep, time, uniform, uv, vec3 } from 'three/tsl';
import { MeshStandardNodeMaterial } from 'three/webgpu';

// Plants move with the wind: leaves, pine boughs, reeds and grass get a TSL shader (WebGPU, and WebGL 2 through the
// same renderer) that bends them in slow gusts crossing the map and makes them flutter. Everything is done in the
// vertex shader: no extra draw calls, no per-frame work on the CPU.

// 0 in the desolate world, 1 once the world has recovered (MundoRecuperado sets it): the plants turn green.
export const vegetation = { recovered: uniform(0) };

type Sway = {
  // Heights of the model (m above its base) between which it goes from still to moving the most.
  from: number;
  to: number;
  // How far its top bends (m) and how much its leaves flutter (m).
  bend: number;
  flutter: number;
  // What its own colour is multiplied by once the world has recovered (its models are painted grey and withered).
  recovered: readonly [number, number, number];
};

// The plants of Map.blend that sway, by the name of their material. They are drawn instanced with their base at the
// origin of each model, so the height of a vertex in its model says how far it is from what holds it.
const SWAYING: readonly (readonly [RegExp, Sway])[] = [
  [/^PinoFollaje$/, { from: 1.3, to: 12, bend: 0.2, flutter: 0.03, recovered: [0.75, 2.3, 0.85] }],
  [/^BosqueFollaje$/, { from: 5, to: 14, bend: 0.22, flutter: 0.05, recovered: [0.9, 2.2, 0.7] }],
  [/^Pantano(Junco|Espadana)$/, { from: 0, to: 1.9, bend: 0.22, flutter: 0.015, recovered: [0.8, 1.9, 0.6] }],
];

// The wind at a point of the ground plane (x, z in meters): a slow swing whose strength comes and goes in gusts that
// travel across the map, between -1 and 1.
type Coordinate = typeof positionLocal.x;
function gustAt(x: Coordinate, z: Coordinate) {
  const place = x.mul(0.13).add(z.mul(0.11));
  const gust = sin(time.mul(0.6).add(place.mul(0.55))).mul(0.5).add(0.5);
  return sin(time.mul(1.5).add(place)).mul(gust.mul(0.65).add(0.35));
}

function swaying(old: MeshStandardMaterial, { from, to, bend, flutter, recovered }: Sway) {
  const material = new MeshStandardNodeMaterial();
  material.color.copy(old.color);
  material.map = old.map;
  material.roughness = old.roughness;
  material.metalness = old.metalness;
  material.roughnessMap = old.roughnessMap;
  material.normalMap = old.normalMap;
  material.transparent = old.transparent;
  material.opacity = old.opacity;
  material.alphaTest = old.alphaTest;
  material.side = old.side;
  material.vertexColors = old.vertexColors;
  material.flatShading = old.flatShading;
  // positionLocal already carries the instance's place in the world; positionGeometry is the vertex in its model.
  const height = smoothstep(from, to, positionGeometry.y);
  const reach = height.mul(height);
  const swing = gustAt(positionLocal.x, positionLocal.z);
  const across = sin(time.mul(1.1).add(positionLocal.x.mul(0.17)).add(positionLocal.z.mul(0.21)));
  const leaf = sin(time.mul(5.7).add(positionGeometry.x.mul(4.1)).add(positionGeometry.z.mul(3.3)).add(positionLocal.x.mul(0.7))).mul(flutter).mul(height);
  material.positionNode = positionLocal.add(vec3(swing.mul(bend).mul(reach).add(leaf), leaf.mul(0.6), swing.mul(bend * 0.45).add(across.mul(bend * 0.3)).mul(reach)));
  material.colorNode = materialColor.mul(mix(vec3(1, 1, 1), vec3(...recovered), vegetation.recovered));
  return material;
}

// The swaying version of a plant's material from Map.blend, or null when it is not one of them.
export function swayingMaterialFor(old: MeshStandardMaterial): Material | null {
  const kind = SWAYING.find(([name]) => name.test(old.name));
  return kind ? swaying(old, kind[1]) : null;
}

type Grass = {
  // Colour at the foot and at the tip of a blade, desolate and recovered.
  dry: readonly [ColorRepresentation, ColorRepresentation];
  green: readonly [ColorRepresentation, ColorRepresentation];
  // Beyond `far` meters from the camera the tufts are not drawn; they sink into the ground over the last `fade`.
  far: number;
  fade: number;
  // How far a tip bends in the wind (m).
  bend: number;
};

// The material of the grass (see models/grassField.ts): every blade goes from a dark foot to a light tip (its uv.y is
// 0 at the foot and 1 at the tip), bends with the wind from the foot up and sinks into the ground far from the camera
// instead of popping out. Each tuft's own tint comes from its instance colour.
export function grassMaterial({ dry, green, far, fade, bend }: Grass) {
  const material = new MeshStandardNodeMaterial();
  material.roughness = 1;
  material.metalness = 0;
  material.side = DoubleSide;
  const linear = (color: ColorRepresentation) => {
    const c = new Color(color);
    return vec3(c.r, c.g, c.b);
  };
  const tip = uv().y;
  const withered = mix(linear(dry[0]), linear(dry[1]), tip);
  const alive = mix(linear(green[0]), linear(green[1]), tip);
  material.colorNode = mix(withered, alive, vegetation.recovered);
  const swing = gustAt(positionLocal.x, positionLocal.z);
  const shiver = sin(time.mul(4.3).add(positionLocal.x.mul(2.1)).add(positionLocal.z.mul(1.7))).mul(0.25);
  const reach = tip.mul(tip).mul(bend);
  const away = positionLocal.xz.sub(cameraPosition.xz).length();
  const sunk = smoothstep(far - fade, far, away).mul(0.6);
  material.positionNode = positionLocal.add(vec3(swing.add(shiver).mul(reach), sunk.negate(), swing.mul(0.5).mul(reach)));
  return material;
}
