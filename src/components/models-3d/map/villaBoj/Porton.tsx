import { useGLTF } from '@react-three/drei';

export function Porton(props: any) {
  const { scene } = useGLTF('/models-3d/map/VillaBoj/Porton.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/VillaBoj/Porton.glb');
