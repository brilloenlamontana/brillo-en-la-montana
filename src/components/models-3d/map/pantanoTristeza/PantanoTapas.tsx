import { useGLTF } from '@react-three/drei';

export function PantanoTapas(props: any) {
  const { scene } = useGLTF('/models-3d/map/PantanoTristeza/PantanoTapas.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/PantanoTristeza/PantanoTapas.glb');
