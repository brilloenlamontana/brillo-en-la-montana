import { BufferGeometry, Group, Mesh, Sphere, Uint32BufferAttribute, Vector3, type Material, type Object3D } from 'three';

// Splits terrain (a single mesh with hundreds of thousands of triangles) into blocks of `size` meters in XZ.
// Each block shares original mesh attributes (uploaded once to the GPU) with its own indices and bounding sphere,
// so Three.js frustum culling discards out-of-view blocks and the GPU processes only visible ones.
// Physics keeps using the full original mesh.
export function splitTerrain(root: Object3D, size = 48): Group {
  root.updateMatrixWorld(true);
  const group = new Group();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !mesh.geometry.index) return;
    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const index = geometry.index!;
    const chunks = new Map<string, number[]>();
    const a = new Vector3(), b = new Vector3(), c = new Vector3();
    for (let i = 0; i < index.count; i += 3) {
      const ia = index.getX(i), ib = index.getX(i + 1), ic = index.getX(i + 2);
      a.fromBufferAttribute(position, ia).applyMatrix4(mesh.matrixWorld);
      b.fromBufferAttribute(position, ib).applyMatrix4(mesh.matrixWorld);
      c.fromBufferAttribute(position, ic).applyMatrix4(mesh.matrixWorld);
      const key = `${Math.floor((a.x + b.x + c.x) / 3 / size)},${Math.floor((a.z + b.z + c.z) / 3 / size)}`;
      let list = chunks.get(key);
      if (!list) chunks.set(key, (list = []));
      list.push(ia, ib, ic);
    }

    const point = new Vector3();
    for (const indices of chunks.values()) {
      const chunk = new BufferGeometry();
      for (const [name, attribute] of Object.entries(geometry.attributes)) chunk.setAttribute(name, attribute);
      chunk.setIndex(new Uint32BufferAttribute(indices, 1));
      // computeBoundingSphere would traverse all shared vertices; sphere is calculated using only block vertices.
      const center = new Vector3();
      for (const i of indices) center.add(point.fromBufferAttribute(position, i));
      center.divideScalar(indices.length);
      let radius = 0;
      for (const i of indices) radius = Math.max(radius, center.distanceTo(point.fromBufferAttribute(position, i)));
      chunk.boundingSphere = new Sphere(center, radius);
      const part = new Mesh(chunk, mesh.material as Material);
      mesh.matrixWorld.decompose(part.position, part.quaternion, part.scale);
      part.updateMatrix();
      part.matrixAutoUpdate = false;
      group.add(part);
    }
  });
  group.matrixAutoUpdate = false;
  return group;
}
