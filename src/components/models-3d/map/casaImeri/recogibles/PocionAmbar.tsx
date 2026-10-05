import { useGLTF } from '@react-three/drei';

export function PocionAmbar(props: any) {
  const { scene } = useGLTF('/models-3d/map/CasaImeri/Recogibles/PocionAmbar.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/CasaImeri/Recogibles/PocionAmbar.glb');
