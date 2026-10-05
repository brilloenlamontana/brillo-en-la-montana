import { useGLTF } from '@react-three/drei';

export function PocionRoja(props: any) {
  const { scene } = useGLTF('/models-3d/map/CasaImeri/Recogibles/PocionRoja.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/CasaImeri/Recogibles/PocionRoja.glb');
