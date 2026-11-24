import { BufferGeometry, Group, Mesh, Uint32BufferAttribute, type Object3D } from 'three';

// Second UV map of the terrain ("Tapas" in Map.blend): 1 on the faces that only cover a swamp well, 0 on the rest.
const COVER_ATTRIBUTE = 'uv1';

// The ground that holds the player: the terrain without the faces that cover the swamp wells. Those faces are part of
// the drawn terrain (so the ground shows no seam over a well), but whoever steps on one falls through. It shares the
// terrain's vertices: only the list of triangles is its own.
export function walkableTerrain(root: Object3D): Group {
  root.updateMatrixWorld(true);
  const group = new Group();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !mesh.geometry.index) return;
    const { index, attributes } = mesh.geometry;
    const cover = attributes[COVER_ATTRIBUTE];
    const kept: number[] = [];
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i), b = index.getX(i + 1), c = index.getX(i + 2);
      if (cover && cover.getX(a) > 0.5 && cover.getX(b) > 0.5 && cover.getX(c) > 0.5) continue;
      kept.push(a, b, c);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', attributes.position);
    geometry.setIndex(new Uint32BufferAttribute(kept, 1));
    const part = new Mesh(geometry);
    mesh.matrixWorld.decompose(part.position, part.quaternion, part.scale);
    group.add(part);
  });
  return group;
}
