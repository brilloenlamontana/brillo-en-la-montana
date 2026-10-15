import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import { areWellsSafe } from '../../../../constants/mission';
import { VISIBLE_FROM } from '../../../../constants/regionVisibility';
import { usePantanoWells } from '../../../../hooks/usePantanoWells';
import { useVisibleFrom } from '../../../../hooks/useRegion';
import { useProgressStore } from '../../../../store/progressStore';
import { mergeStaticMeshes } from '../../../../utils/mergeStaticMeshes';
import { PANTANO_POZOS_URL } from '../../../../utils/wells';
import { CameraColliderBoxes } from '../../CameraColliderBoxes';

const LID_THICKNESS = 0.3;
// El borde de los pozos queda a ±0.3 m del suelo de alrededor; la tapa un poco más abajo no se nota como escalón.
const LID_TOP_BELOW_RIM = 0.12;

// Cada pozo es una trampa: el terreno tiene un hueco tapado solo visualmente. Las paredes y el fondo físicos
// detienen la caída; las paredes de cámara la mantienen dentro del pozo oscuro.
// Con el golem y los zumbadores derrotados, una tapa física sobre cada hueco impide volver a caer.
export function PantanoPozos() {
  const { scene } = useGLTF(PANTANO_POZOS_URL);
  // 64 pozos con 3 materiales: juntos por material son 3 llamadas de dibujo en vez de 192.
  const merged = useMemo(() => mergeStaticMeshes(scene), [scene]);
  const visible = useVisibleFrom(VISIBLE_FROM.pozos);
  const wells = usePantanoWells();
  const physicsBoxes = useMemo(() => wells.flatMap((well) => well.physicsBoxes), [wells]);
  const cameraBoxes = useMemo(() => wells.flatMap((well) => well.cameraBoxes), [wells]);
  const wellsSafe = useProgressStore((state) => areWellsSafe(state.progress));

  return (
    <>
      <primitive object={merged} visible={visible} />
      <RigidBody type="fixed" colliders={false}>
        {physicsBoxes.map(({ id, position, args, rotation }) => (
          <CuboidCollider key={id} position={position} args={args} rotation={rotation} />
        ))}
        {wellsSafe &&
          wells.map((well) => (
            <CylinderCollider
              key={`${well.name}-tapa`}
              position={[well.x, well.rimY - LID_TOP_BELOW_RIM - LID_THICKNESS / 2, well.z]}
              args={[LID_THICKNESS / 2, well.outerRadius + 0.3]}
            />
          ))}
      </RigidBody>
      <CameraColliderBoxes boxes={cameraBoxes} />
    </>
  );
}

useGLTF.preload(PANTANO_POZOS_URL);
