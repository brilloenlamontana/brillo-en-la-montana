import { useGLTF } from '@react-three/drei';

export function PocionHojas(props: any) {
  const { scene } = useGLTF('/models-3d/map/CasaImeri/Recogibles/PocionHojas.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/CasaImeri/Recogibles/PocionHojas.glb');
