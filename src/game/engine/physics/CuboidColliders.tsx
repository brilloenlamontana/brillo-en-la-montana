import type { ReactNode } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import type { ColliderBox } from './colliderBoxes';

type CuboidCollidersProps = {
  boxes: readonly ColliderBox[];
  // Frame the boxes are measured in; world space when omitted.
  position?: [number, number, number];
  rotation?: [number, number, number];
  children?: ReactNode;
};

// Static collision made only of cuboids, the cheapest shape for Rapier: one fixed body holds every box.
// The project rule is to collide only where the avatar walks or bumps into something (see README).
export function CuboidColliders({ boxes, position, rotation, children }: CuboidCollidersProps) {
  return (
    <RigidBody type="fixed" colliders={false} position={position} rotation={rotation}>
      {boxes.map((box) => (
        <CuboidCollider key={box.id} position={box.position} args={box.args} rotation={box.rotation} />
      ))}
      {children}
    </RigidBody>
  );
}
