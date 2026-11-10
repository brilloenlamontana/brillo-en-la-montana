import { useGLTF } from '@react-three/drei';
import { CameraColliderBoxes } from '@/game/engine/camera/CameraColliderBoxes';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO3_MODELS } from '../assets';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { TUNEL_CAMERA_BLOCKERS, TUNEL_COLLIDERS } from './tunelColliders';

const { estructura: ESTRUCTURA_URL, objetos: OBJETOS_URL } = DESAFIO3_MODELS.tunelesCumbre;

// "TunelesCumbre" collection of Map.blend: the maze of galleries inside the Summit of Desolation, from the mine mouth in
// Hedrig's town to the exit pit on the summit (true route, two loops and four dead ends; network in
// world/tunelesRed.ts). The models are only drawn; the avatar and the camera collide with boxes measured on the real
// galleries (tunelColliders.ts) instead of their heavy meshes.
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
