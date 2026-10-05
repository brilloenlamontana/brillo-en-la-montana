import { useGLTF } from '@react-three/drei';
import { useLodScene } from '../../../../hooks/useLodScene';

const ROCAS_URLS = ['/models-3d/map/Rocas/Rocas.glb'];
const ROCAS_DISTANCES = [0, 120];

export function Rocas(props: any) {
  const lodScene = useLodScene(ROCAS_URLS, ROCAS_DISTANCES);
  return (
    <primitive object={lodScene} {...props} />
  );
}

useGLTF.preload(ROCAS_URLS);
