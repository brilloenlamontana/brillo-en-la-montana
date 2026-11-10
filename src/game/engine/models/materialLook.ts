import { Color, type Material, type Mesh, type MeshStandardMaterial, type Object3D } from 'three';

// An alternative look for flat-colour materials, by material name: a new colour, or null to hide what it paints.
export type MaterialLook = Readonly<Record<string, string | null>>;

const ownColors = new WeakMap<Material, Color>();

// Paints the materials of `root` named in `look` with their alternative colour while `on`, and gives them back their
// own colour (and visibility) otherwise. Materials are shared by every mesh of a GLB: one pass covers them all.
export function applyMaterialLook(root: Object3D, look: MaterialLook, on: boolean) {
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    for (const material of ([] as Material[]).concat(mesh.material) as MeshStandardMaterial[]) {
      if (!(material.name in look) || !material.color) continue;
      if (!ownColors.has(material)) ownColors.set(material, material.color.clone());
      const color = look[material.name];
      material.visible = !(on && color === null);
      material.color.copy(on && color !== null ? new Color(color) : ownColors.get(material)!);
    }
  });
}
