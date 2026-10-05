import { useGLTF } from '@react-three/drei';

export function Villa(props: any) {
  const { scene } = useGLTF('/models-3d/map/VillaBoj/Villa.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/VillaBoj/Villa.glb');
