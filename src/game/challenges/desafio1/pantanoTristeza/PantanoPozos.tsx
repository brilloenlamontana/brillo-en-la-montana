import { useLayoutEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { CylinderCollider } from '@react-three/rapier';
import { MeshBasicMaterial, type Mesh } from 'three';
import { CameraColliderBoxes } from '@/game/engine/camera/CameraColliderBoxes';
import { freeze } from '@/game/engine/models/sceneUtils';
import type { ColliderBox } from '@/game/engine/physics/colliderBoxes';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useVisibleFrom } from '@/game/world/visibility';
import { useProgressStore } from '@/store/progressStore';
import { areWellsSafe } from '../mission';
import { CAMERA_BLOCKS_IN, VISIBLE_FROM } from '../visibility';
import { DESAFIO1_MODELS } from '../assets';
import { usePantanoWells } from './wells';

const OSCURIDAD_URL = DESAFIO1_MODELS.pantanoTristeza.oscuridad;
// Plain black, the same in any light and at any distance: under the ground there is nothing to see.
const DARKNESS = new MeshBasicMaterial({ color: '#000000', fog: false, toneMapped: false });

const LID_THICKNESS = 0.3;
// The rims sit ±0.3 m from the ground around them: a lid slightly below the rim does not feel like a step.
const LID_TOP_BELOW_RIM = 0.12;
const NO_BOXES: ColliderBox[] = [];

// Each well is a trap hidden under the ground: the terrain is drawn whole, but its physics has an opening over each
// well. The wells themselves are not drawn: physical walls and a floor stop the fall, camera walls keep the camera
// inside, and a black shell under the ground (PantanoPozosOscuridad in Map.blend: the underside of the terrain around
// each well, walls and a floor) makes everything seen from down there dark. Once the golem and every zumbador are
// defeated a solid lid closes each opening for good, and nothing of the wells is drawn or simulated.
export function PantanoPozos() {
  const { scene: darkness } = useGLTF(OSCURIDAD_URL);
  useLayoutEffect(() => {
    darkness.traverse((object) => {
      const mesh = object as Mesh;
      if (mesh.isMesh) mesh.material = DARKNESS;
    });
    freeze(darkness);
  }, [darkness]);
  const visible = useVisibleFrom(VISIBLE_FROM.pozos);
  const cameraActive = useVisibleFrom(CAMERA_BLOCKS_IN.pozos);
  const wells = usePantanoWells();
  const physicsBoxes = useMemo(() => wells.flatMap((well) => well.physicsBoxes), [wells]);
  const cameraBoxes = useMemo(() => wells.flatMap((well) => well.cameraBoxes), [wells]);
  const wellsSafe = useProgressStore((state) => areWellsSafe(state.progress));

  return (
    <>
      <primitive object={darkness} visible={visible && !wellsSafe} />
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

