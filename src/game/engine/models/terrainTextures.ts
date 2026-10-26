import type { Material, Mesh, MeshStandardMaterial, Object3D, Texture } from 'three';

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

// Each GLB (terrain, well covers) brings its own copy of the terrain texture: each 4096px copy takes
// ~85 MB of video memory, too much for an integrated GPU. Here they all share textures from `source`
// and duplicate textures are disposed before uploading to GPU.
export function shareTerrainTextures(source: Object3D, ...targets: Object3D[]) {
  const [reference] = materialsOf(source);
  if (!reference) return;
  for (const target of targets) {
    for (const material of materialsOf(target)) {
      const duplicates = new Set<Texture>();
      for (const slot of TEXTURE_SLOTS) {
        const texture = material[slot];
        if (texture && texture !== reference[slot]) duplicates.add(texture);
        material[slot] = reference[slot];
      }
      duplicates.forEach((texture) => texture.dispose());
      material.needsUpdate = true;
    }
  }
}
