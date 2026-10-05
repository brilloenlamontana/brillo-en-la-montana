import { useGLTF } from '@react-three/drei';

export function Rocas(props: any) {
  const { scene } = useGLTF('/models-3d/map/Rocas/Rocas.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/Rocas/Rocas.glb');
