import { useGLTF } from '@react-three/drei';

export function BosqueHongos(props: any) {
  const { scene } = useGLTF('/models-3d/map/BosqueOscuridad/BosqueHongos.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/BosqueOscuridad/BosqueHongos.glb');
