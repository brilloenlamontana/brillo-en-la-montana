import { useGLTF } from '@react-three/drei';

export function ImeriInterior(props: any) {
  const { scene } = useGLTF('/models-3d/map/CasaImeri/ImeriInterior.glb');
  return (
    <primitive object={scene} {...props} />
  );
}
