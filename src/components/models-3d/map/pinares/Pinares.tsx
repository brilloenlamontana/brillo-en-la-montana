import { useGLTF } from '@react-three/drei';

export function Pinares(props: any) {
  const { scene } = useGLTF('/models-3d/map/Pinares/Pinares.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/Pinares/Pinares.glb');
