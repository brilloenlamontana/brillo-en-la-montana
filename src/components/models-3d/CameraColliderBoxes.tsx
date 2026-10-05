import { useEffect, useRef } from 'react';
import { BoxGeometry, type Group } from 'three';
import { useCameraColliderStore } from '../../store/cameraColliderStore';

export type ColliderBox = {
  id: string;
  position: [number, number, number];
  args: [number, number, number];
  rotation?: [number, number, number];
};

// Caja de 2x2x2 escalada por los half-extents, igual que los args de CuboidCollider.
const UNIT_BOX = new BoxGeometry(2, 2, 2);

// Cajas invisibles para que la cámara no atraviese paredes. El Raycaster de three no mira `visible`,
// así que se detectan aunque nunca se dibujen.
export function CameraColliderBoxes({ boxes }: { boxes: ColliderBox[] }) {
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const { addCollider, removeCollider } = useCameraColliderStore.getState();
    addCollider(group);
    return () => removeCollider(group);
  }, []);

  return (
    <group ref={groupRef} visible={false}>
      {boxes.map(({ id, position, args, rotation }) => (
        <mesh key={id} geometry={UNIT_BOX} position={position} rotation={rotation} scale={args} />
      ))}
    </group>
  );
}
