import { useGLTF } from '@react-three/drei';
import { useLodScene } from '../../../../hooks/useLodScene';

const BOSQUE_MANZANAS_URLS = ['/models-3d/map/BosqueOscuridad/BosqueManzanas.glb'];
const BOSQUE_MANZANAS_DISTANCES = [0, 80];

export function BosqueManzanas(props: any) {
  const lodScene = useLodScene(BOSQUE_MANZANAS_URLS, BOSQUE_MANZANAS_DISTANCES);
  return (
    <primitive object={lodScene} {...props} />
  );
}

useGLTF.preload(BOSQUE_MANZANAS_URLS);
