import { useGLTF } from '@react-three/drei';
import { useLodScene } from '../../../../hooks/useLodScene';

const BOSQUE_HONGOS_URLS = ['/models-3d/map/BosqueOscuridad/BosqueHongos.glb'];
const BOSQUE_HONGOS_DISTANCES = [0, 80];

export function BosqueHongos(props: any) {
  const lodScene = useLodScene(BOSQUE_HONGOS_URLS, BOSQUE_HONGOS_DISTANCES);
  return (
    <primitive object={lodScene} {...props} />
  );
}

useGLTF.preload(BOSQUE_HONGOS_URLS);
