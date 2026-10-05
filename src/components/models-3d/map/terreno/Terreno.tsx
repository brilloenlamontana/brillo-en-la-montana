import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { TERRAIN_BODY_NAME } from '../../../../constants/bodies';

// Objeto estable: si cambia entre renders, @react-three/rapier reaplica las opciones del cuerpo en cada render.
const TERRAIN_USER_DATA = { name: TERRAIN_BODY_NAME };

export function Terreno(props: any) {
  const { scene } = useGLTF('/models-3d/map/Terreno/Terreno.glb');
  return (
    <RigidBody type='fixed' colliders='trimesh' userData={TERRAIN_USER_DATA}>
      <primitive object={scene} {...props} />
    </RigidBody>
  );
}

useGLTF.preload('/models-3d/map/Terreno/Terreno.glb');
