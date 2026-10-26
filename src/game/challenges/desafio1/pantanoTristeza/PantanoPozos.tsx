import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { CylinderCollider } from '@react-three/rapier';
import { CameraColliderBoxes } from '@/game/engine/camera/CameraColliderBoxes';
import { mergeStaticMeshes } from '@/game/engine/models/mergeStaticMeshes';
import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { areWellsSafe } from '../mission';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { POZOS_URL, usePantanoWells } from './wells';

const LID_THICKNESS = 0.3;
// The rims sit ±0.3 m from the ground around them: a lid slightly below the rim does not feel like a step.
const LID_TOP_BELOW_RIM = 0.12;
const NO_BOXES: ColliderBox[] = [];

// Each well is a trap: the terrain has an opening that the lids only cover visually. Physical walls and a floor stop
// the fall, and camera walls keep the camera inside the dark well. Once the golem and every zumbador are defeated a
// solid lid closes each hole for good, and the wells (walls, floor, camera walls) are neither drawn nor simulated.
export function PantanoPozos() {
  const { scene } = useGLTF(POZOS_URL);
  // 42 wells with 3 materials: 3 draw calls instead of 126.
  const merged = useMemo(() => mergeStaticMeshes(scene), [scene]);
  const visible = useVisibleFrom(VISIBLE_FROM.pozos);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.pozos);
  const wells = usePantanoWells();
  const physicsBoxes = useMemo(() => wells.flatMap((well) => well.physicsBoxes), [wells]);
  const cameraBoxes = useMemo(() => wells.flatMap((well) => well.cameraBoxes), [wells]);
  const wellsSafe = useProgressStore((state) => areWellsSafe(state.progress));

  return (
    <>
      <primitive object={merged} visible={visible && !wellsSafe} />
      <CuboidColliders boxes={wellsSafe ? NO_BOXES : physicsBoxes}>
        {wellsSafe &&
          wells.map((well) => (
            <CylinderCollider
              key={`${well.name}-tapa`}
              position={[well.x, well.rimY - LID_TOP_BELOW_RIM - LID_THICKNESS / 2, well.z]}
              args={[LID_THICKNESS / 2, well.outerRadius + 0.3]}
            />
          ))}
      </CuboidColliders>
      <CameraColliderBoxes boxes={cameraBoxes} active={cameraActive && !wellsSafe} />
    </>
  );
}

useGLTF.preload(POZOS_URL);
