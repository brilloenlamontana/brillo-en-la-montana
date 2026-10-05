import { useGLTF } from '@react-three/drei';

export function PocionHongos(props: any) {
  const { scene } = useGLTF('/models-3d/map/CasaImeri/Recogibles/PocionHongos.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/CasaImeri/Recogibles/PocionHongos.glb');
