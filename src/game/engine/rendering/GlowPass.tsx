import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { Mesh, SkinnedMesh } from 'three';
import { glowMaterialFor } from './glowMaterials';

// Seconds between two passes over the scene: often while the world loads (models keep arriving), seldom afterwards.
const EAGER_SECONDS = 0.2;
const LAZY_SECONDS = 1.5;
const EAGER_FOR = 30;

// Gives every material of the map that shines its shader (see glowMaterials.ts). The whole world is mounted from the
// start, hidden or not, so one pass over the scene right after loading reaches every model before it is first seen;
// the later, slower passes catch whatever mounts afterwards. Characters (skinned meshes) are left alone.
export function GlowMaterials() {
  const scene = useThree((state) => state.scene);
  const clock = useRef({ elapsed: 0, next: 0 });

  useFrame((_, delta) => {
    const c = clock.current;
    c.elapsed += delta;
    if (c.elapsed < c.next) return;
    c.next = c.elapsed + (c.elapsed < EAGER_FOR ? EAGER_SECONDS : LAZY_SECONDS);
    scene.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh || (mesh as SkinnedMesh).isSkinnedMesh) return;
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material, i) => {
          const glow = glowMaterialFor(material);
          if (glow) (mesh.material as typeof mesh.material & unknown[])[i] = glow;
        });
      } else {
        const glow = glowMaterialFor(mesh.material);
        if (glow) mesh.material = glow;
      }
    });
  });

  return null;
}
