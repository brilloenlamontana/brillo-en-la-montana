import { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import type { Object3D } from 'three';
import { useCameraCollider } from '@/game/engine/camera/useCameraCollider';
import { mergeStaticMeshes } from './mergeStaticMeshes';
import { freeze, pickNodes } from './sceneUtils';

// Static trimesh colliders built from named nodes of a loaded model (walls, floors, stairs...).
export function TrimeshColliders({ scene, names }: { scene: Object3D; names: readonly string[] }) {
  const group = useMemo(() => pickNodes(scene, names), [scene, names]);
  return (
    <RigidBody type="fixed" colliders="trimesh" includeInvisible>
      <primitive object={group} visible={false} />
    </RigidBody>
  );
}

// Camera-only blockers (no physics): the camera collides with these nodes, never drawn, while `active`.
export function CameraBlockers({ scene, names, active = true }: { scene: Object3D; names: readonly string[]; active?: boolean }) {
  const group = useMemo(() => pickNodes(scene, names), [scene, names]);
  useCameraCollider(group, active);
  return null;
}

type StaticModelProps = {
  url: string;
  visible?: boolean;
  // Nodes that collide with the player (trimesh).
  colliders?: readonly string[];
  cameraBlockers?: readonly string[];
  // When false the camera ignores cameraBlockers (the player is far away).
  cameraActive?: boolean;
  // Merges parts by material: an interior with dozens of furniture meshes collapses into a few draw calls.
  merge?: boolean;
};

// A GLB exported from Map.blend, already placed in world coordinates, with optional collision. Its matrices are frozen
// (static scenery). Hiding it with `visible` keeps its colliders and its GPU buffers, so showing it again is free.
export function StaticModel({ url, visible = true, colliders, cameraBlockers, cameraActive = true, merge = false }: StaticModelProps) {
  const { scene } = useGLTF(url);
  useLayoutEffect(() => freeze(scene), [scene]);
  const drawn = useMemo(() => (merge ? mergeStaticMeshes(scene) : scene), [merge, scene]);

  return (
    <>
      <primitive object={drawn} visible={visible} />
      {colliders && colliders.length > 0 && <TrimeshColliders scene={scene} names={colliders} />}
      {cameraBlockers && cameraBlockers.length > 0 && <CameraBlockers scene={scene} names={cameraBlockers} active={cameraActive} />}
    </>
  );
}
