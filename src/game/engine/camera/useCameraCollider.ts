import { useEffect } from 'react';
import type { Object3D } from 'three';
import { useCameraColliderStore } from './cameraColliderStore';

// Registers `object` as an obstacle for the third-person camera while `active`. The camera raycasts every registered
// object each frame, so only what surrounds the player should be active (see each challenge's visibility.ts).
export function useCameraCollider(object: Object3D, active = true) {
  useEffect(() => {
    if (!active) return;
    object.updateMatrixWorld(true);
    const { addCollider, removeCollider } = useCameraColliderStore.getState();
    addCollider(object);
    return () => removeCollider(object);
  }, [object, active]);
}
