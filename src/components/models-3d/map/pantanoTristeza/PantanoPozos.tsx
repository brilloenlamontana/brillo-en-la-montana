import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useLodScene } from '../../../../hooks/useLodScene';
import { usePantanoWells } from '../../../../hooks/usePantanoWells';
import { PANTANO_POZOS_URL } from '../../../../utils/wells';
import { CameraColliderBoxes } from '../../CameraColliderBoxes';

const PANTANO_POZOS_URLS = [PANTANO_POZOS_URL];
const PANTANO_POZOS_DISTANCES = [0, 120];

// Cada pozo es una trampa: el terreno tiene un hueco tapado solo visualmente. Las paredes y el fondo físicos
// detienen la caída; las paredes de cámara la mantienen dentro del pozo oscuro.
export function PantanoPozos(props: any) {
  const lodScene = useLodScene(PANTANO_POZOS_URLS, PANTANO_POZOS_DISTANCES);
  const wells = usePantanoWells();
  const physicsBoxes = useMemo(() => wells.flatMap((well) => well.physicsBoxes), [wells]);
  const cameraBoxes = useMemo(() => wells.flatMap((well) => well.cameraBoxes), [wells]);

  return (
    <>
      <primitive object={lodScene} {...props} />
      <RigidBody type="fixed" colliders={false}>
        {physicsBoxes.map(({ id, position, args, rotation }) => (
          <CuboidCollider key={id} position={position} args={args} rotation={rotation} />
        ))}
      </RigidBody>
      <CameraColliderBoxes boxes={cameraBoxes} />
    </>
  );
}

useGLTF.preload(PANTANO_POZOS_URLS);
