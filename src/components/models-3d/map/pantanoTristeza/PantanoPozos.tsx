import { useGLTF } from '@react-three/drei';

export function PantanoPozos(props: any) {
  const { scene } = useGLTF('/models-3d/map/PantanoTristeza/PantanoPozos.glb');
  return (
    <primitive object={scene} {...props} />
  );
}

useGLTF.preload('/models-3d/map/PantanoTristeza/PantanoPozos.glb');
