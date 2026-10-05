import { useGLTF } from '@react-three/drei';
import { useLodScene } from '../../../../hooks/useLodScene';

const PANTANO_TAPAS_URLS = ['/models-3d/map/PantanoTristeza/PantanoTapas.glb'];
const PANTANO_TAPAS_DISTANCES = [0, 120];

export function PantanoTapas(props: any) {
  const lodScene = useLodScene(PANTANO_TAPAS_URLS, PANTANO_TAPAS_DISTANCES);
  return (
    <primitive object={lodScene} {...props} />
  );
}

useGLTF.preload(PANTANO_TAPAS_URLS);
