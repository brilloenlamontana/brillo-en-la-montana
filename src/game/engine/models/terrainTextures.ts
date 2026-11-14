import {
  ClampToEdgeWrapping,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type Texture,
} from 'three';
import { materialColor, positionWorld, texture as sample } from 'three/tsl';
import type { MeshStandardNodeMaterial } from 'three/webgpu';
import { knownBackend } from '@/game/engine/rendering/backend';

type ColorNode = NonNullable<MeshStandardNodeMaterial['colorNode']>;

// Materials painted with the baked terrain texture (TerrenoColor 4096 px + TerrenoRugosidad).
const TERRAIN_MATERIALS = new Set(['TerrenoMaterial', 'TerrenoTapa']);
const TEXTURE_SLOTS = ['map', 'roughnessMap', 'metalnessMap'] as const;

// The baked colour covers the whole map with one picture (about 10 texels per metre), which looks blurred and blocky
// under the avatar's feet. Two things sharpen it without a bigger picture:
// - anisotropic filtering, because the ground is almost always seen at a grazing angle;
// - a small grey picture of earth grain that repeats over the ground (in world space, at two sizes so the repetition
//   does not show) and lightens or darkens the baked colour a little: detail that only shows from near.
const ANISOTROPY = 8;
const DETAIL_URL = '/textures/terreno-detalle.jpg';
// Metres each copy of the grain covers, near and far, and how much it changes the colour (0 nothing).
const DETAIL_NEAR_METERS = 1.7;
const DETAIL_FAR_METERS = 9;
const DETAIL_STRENGTH = 0.75;

const sharpen = (texture: Texture | null) => {
  if (!texture || texture.anisotropy === ANISOTROPY) return;
  texture.anisotropy = ANISOTROPY;
  texture.needsUpdate = true;
};

// The baked colour (whichever picture the material shows) times the grain: built once, shared by every terrain material.
let detailed: ColorNode | null = null;
function detailedColor(): ColorNode {
  if (detailed) return detailed;
  const grain = new TextureLoader().load(DETAIL_URL);
  grain.wrapS = grain.wrapT = RepeatWrapping;
  grain.colorSpace = NoColorSpace;
  grain.anisotropy = ANISOTROPY;
  const ground = positionWorld.xz;
  const near = sample(grain, ground.div(DETAIL_NEAR_METERS)).r;
  const far = sample(grain, ground.div(DETAIL_FAR_METERS).add(0.37)).r;
  // The grain is grey around 0.5: around 1 as a factor.
  const factor = near.mul(0.65).add(far.mul(0.35)).sub(0.5).mul(DETAIL_STRENGTH).add(1);
  detailed = materialColor.mul(factor);
  return detailed;
}

const materialsOf = (root: Object3D): MeshStandardMaterial[] => {
  const found: MeshStandardMaterial[] = [];
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    for (const material of ([] as Material[]).concat(mesh.material)) {
      if (TERRAIN_MATERIALS.has(material.name)) found.push(material as MeshStandardMaterial);
    }
  });
  return found;
};

// Every terrain material in the world, the colour texture each one came with and the one that replaces it for now
// (the recovered map, once the game is completed): whoever registers later gets the current look too.
const registered = new Set<MeshStandardMaterial>();
const ownMaps = new WeakMap<MeshStandardMaterial, Texture | null>();
let override: Texture | null = null;

const applyLook = (material: MeshStandardMaterial) => {
  const next = override ?? ownMaps.get(material) ?? null;
  sharpen(next);
  if (material.map === next) return;
  material.map = next;
  material.needsUpdate = true;
};

const register = (material: MeshStandardMaterial) => {
  if (!registered.has(material)) {
    registered.add(material);
    ownMaps.set(material, material.map);
  }
  withDetail(material);
  applyLook(material);
};

// The renderer (WebGPU) turns each material into a node material, copying its properties: a colour node set on the
// plain material is taken along.
// Only with WebGPU: drawn with WebGL 2 the grain read as a restless speckle over the ground, so there the terrain keeps
// its plain baked colour.
function withDetail(material: MeshStandardMaterial) {
  if (knownBackend() === 'webgl') return;
  const nodes = material as MeshStandardMaterial & { colorNode?: ColorNode | null };
  if (nodes.colorNode) return;
  nodes.colorNode = detailedColor();
  material.needsUpdate = true;
}

// The terrain materials of `root` follow the colour texture set with setTerrainColorOverride.
export function registerTerrainMaterials(root: Object3D) {
  materialsOf(root).forEach(register);
}

// Paints all the terrain with `texture` (same UVs as the baked one); null goes back to each material's own.
export function setTerrainColorOverride(texture: Texture | null) {
  override = texture;
  registered.forEach(applyLook);
}

const loads = new Map<string, Promise<Texture>>();

// Loads (once) an alternative colour texture for the terrain, set up like the one inside the GLB.
export function loadTerrainColorTexture(url: string): Promise<Texture> {
  let load = loads.get(url);
  if (!load) {
    load = new TextureLoader().loadAsync(url).then((texture) => {
      const [own] = [...registered].map((material) => ownMaps.get(material)).filter(Boolean) as Texture[];
      texture.flipY = false;
      texture.colorSpace = SRGBColorSpace;
      texture.wrapS = texture.wrapT = ClampToEdgeWrapping;
      if (own) texture.anisotropy = own.anisotropy;
      return texture;
    });
    loads.set(url, load);
  }
  return load;
}

// Each GLB (terrain, well covers) brings its own copy of the terrain texture: each 4096px copy takes
// ~85 MB of video memory, too much for an integrated GPU. Here they all share textures from `source`
// and duplicate textures are disposed before uploading to GPU.
export function shareTerrainTextures(source: Object3D, ...targets: Object3D[]) {
  const [reference] = materialsOf(source);
  if (!reference) return;
  register(reference);
  // The reference's own textures: its `map` may be showing the override right now.
  const shared = { map: ownMaps.get(reference) ?? null, roughnessMap: reference.roughnessMap, metalnessMap: reference.metalnessMap };
  for (const target of targets) {
    for (const material of materialsOf(target)) {
      const current = { ...shared, map: registered.has(material) ? (ownMaps.get(material) ?? null) : material.map };
      const duplicates = new Set<Texture>();
      for (const slot of TEXTURE_SLOTS) {
        const texture = slot === 'map' ? current.map : material[slot];
        if (texture && texture !== shared[slot]) duplicates.add(texture);
        if (slot !== 'map') material[slot] = shared[slot];
      }
      duplicates.forEach((texture) => texture.dispose());
      registered.add(material);
      ownMaps.set(material, shared.map);
      withDetail(material);
      material.needsUpdate = true;
      applyLook(material);
    }
  }
}
