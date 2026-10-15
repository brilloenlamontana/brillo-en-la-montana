import { useGLTF } from '@react-three/drei';

const IMERI_INTERIOR_URL = '/models-3d/map/CasaImeri/ImeriInterior.glb';

export function ImeriInterior() {
  const { scene } = useGLTF(IMERI_INTERIOR_URL);
  return <primitive object={scene} />;
}

useGLTF.preload(IMERI_INTERIOR_URL);
