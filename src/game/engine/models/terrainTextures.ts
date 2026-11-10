import { ClampToEdgeWrapping, SRGBColorSpace, TextureLoader, type Material, type Mesh, type MeshStandardMaterial, type Object3D, type Texture } from 'three';

// Materials painted with the baked terrain texture (TerrenoColor 4096 px + TerrenoRugosidad).
const TERRAIN_MATERIALS = new Set(['TerrenoMaterial', 'TerrenoTapa']);
const TEXTURE_SLOTS = ['map', 'roughnessMap', 'metalnessMap'] as const;

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
  if (material.map === next) return;
  material.map = next;
  material.needsUpdate = true;
};

const register = (material: MeshStandardMaterial) => {
  if (!registered.has(material)) {
    registered.add(material);
    ownMaps.set(material, material.map);
  }
  applyLook(material);
};

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
      material.needsUpdate = true;
      applyLook(material);
    }
  }
}
