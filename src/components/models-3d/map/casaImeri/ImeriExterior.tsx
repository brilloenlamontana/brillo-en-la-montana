import { useGLTF } from '@react-three/drei';

export function ImeriExterior(props: any) {
  const { scene } = useGLTF('/models-3d/map/CasaImeri/ImeriExterior.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/CasaImeri/ImeriExterior.glb');
