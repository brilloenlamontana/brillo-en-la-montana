import { useGLTF } from '@react-three/drei';

export function PocionPequena(props: any) {
  const { scene } = useGLTF('/models-3d/map/CasaImeri/Recogibles/PocionPequeña.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/CasaImeri/Recogibles/PocionPequeña.glb');
