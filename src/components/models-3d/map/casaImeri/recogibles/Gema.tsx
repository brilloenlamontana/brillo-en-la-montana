import { useGLTF } from '@react-three/drei';

export function Gema(props: any) {
  const { scene } = useGLTF('/models-3d/map/CasaImeri/Recogibles/Gema.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/CasaImeri/Recogibles/Gema.glb');
