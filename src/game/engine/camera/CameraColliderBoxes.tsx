import { useMemo } from 'react';
import { BoxGeometry, Group, Mesh } from 'three';
import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { useCameraCollider } from './useCameraCollider';

// 2x2x2 box scaled by half-extents, identical to CuboidCollider args.
const UNIT_BOX = new BoxGeometry(2, 2, 2);

// Invisible boxes that keep the camera from clipping through walls. Three's Raycaster ignores `visible`, so they are
// raycast without ever being drawn. They sit in the scene graph so they follow the parent's frame (e.g. a rotated house).
export function CameraColliderBoxes({ boxes, active = true }: { boxes: readonly ColliderBox[]; active?: boolean }) {
  const group = useMemo(() => {
    const root = new Group();
    for (const { position, args, rotation } of boxes) {
      const box = new Mesh(UNIT_BOX);
      box.position.set(...position);
      box.scale.set(...args);
      if (rotation) box.rotation.set(...rotation);
      root.add(box);
    }
    return root;
  }, [boxes]);
  useCameraCollider(group, active);
  return <primitive object={group} visible={false} />;
}
