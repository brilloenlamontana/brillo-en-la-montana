import { useGLTF } from '@react-three/drei';

export function BosqueManzanas(props: any) {
  const { scene } = useGLTF('/models-3d/map/BosqueOscuridad/BosqueManzanas.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/BosqueOscuridad/BosqueManzanas.glb');
