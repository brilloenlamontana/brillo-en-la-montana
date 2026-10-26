import { useGLTF } from '@react-three/drei';
import { CameraColliderBoxes } from '@/game/engine/camera/CameraColliderBoxes';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO3_MODELS } from '../assets';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { TUNEL_CAMERA_BLOCKERS, TUNEL_COLLIDERS } from './tunelColliders';

const { estructura: ESTRUCTURA_URL, objetos: OBJETOS_URL } = DESAFIO3_MODELS.tunelesCumbre;

// "TunelesCumbre" collection of Map.blend: spiral tunnels inside the Summit of Desolation, from the mine mouth in
// Hedrig's town up to the peak. The models are only drawn; the avatar and the camera collide with a few hundred boxes
// laid along the tunnel axis (tunelColliders.ts) instead of the 27k-triangle galleries.
export function TunelesCumbre() {
  const estructuraVisible = useVisibleFrom(VISIBLE_FROM.tuneles);
  const objetosVisibles = useVisibleFrom(VISIBLE_FROM.tunelesObjetos);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.tuneles);

  return (
    <group name="TunelesCumbre">
      <StaticModel url={ESTRUCTURA_URL} visible={estructuraVisible} />
      <StaticModel url={OBJETOS_URL} visible={objetosVisibles} merge />
      <CuboidColliders boxes={TUNEL_COLLIDERS} />
      <CameraColliderBoxes boxes={TUNEL_CAMERA_BLOCKERS} active={cameraActive} />
    </group>
  );
}

useGLTF.preload([ESTRUCTURA_URL, OBJETOS_URL]);
