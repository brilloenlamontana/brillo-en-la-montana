import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { VISIBLE_FROM } from '../../../../constants/regionVisibility';
import { useVisibleFrom } from '../../../../hooks/useRegion';
import { mergeStaticMeshes } from '../../../../utils/mergeStaticMeshes';

const PANTANO_TAPAS_URL = '/models-3d/map/PantanoTristeza/PantanoTapas.glb';

// Las tapas cubren los huecos del suelo sobre cada pozo. Juntas por material son 2 llamadas de dibujo en vez de 128.
export function PantanoTapas() {
  const { scene } = useGLTF(PANTANO_TAPAS_URL);
  const merged = useMemo(() => mergeStaticMeshes(scene), [scene]);
  const visible = useVisibleFrom(VISIBLE_FROM.tapas);
  return <primitive object={merged} visible={visible} />;
}

useGLTF.preload(PANTANO_TAPAS_URL);
