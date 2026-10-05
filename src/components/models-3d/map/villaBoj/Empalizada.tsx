import { useGLTF } from '@react-three/drei';

export function Empalizada(props: any) {
  const { scene } = useGLTF('/models-3d/map/VillaBoj/Empalizada.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/VillaBoj/Empalizada.glb');
