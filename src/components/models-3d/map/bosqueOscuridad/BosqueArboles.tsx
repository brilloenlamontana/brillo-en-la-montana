import { useGLTF } from '@react-three/drei';

export function BosqueArboles(props: any) {
  const { scene } = useGLTF('/models-3d/map/BosqueOscuridad/BosqueArboles.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/BosqueOscuridad/BosqueArboles.glb');
