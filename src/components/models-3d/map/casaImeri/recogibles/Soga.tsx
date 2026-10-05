import { useGLTF } from '@react-three/drei';

export function Soga(props: any) {
  const { scene } = useGLTF('/models-3d/map/CasaImeri/Recogibles/Soga.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/CasaImeri/Recogibles/Soga.glb');
