import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { LIMIT_BODY_NAME } from '@/game/engine/physics/bodies';
import { MAPA_MODELS } from '@/game/world/assets';

const LIMITE_URL = MAPA_MODELS.limiteMapa;
// Stable object: the body is recognized by this name (the camera does not collide with these walls).
const LIMITE_USER_DATA = { name: LIMIT_BODY_NAME };

// LimitesJuego collection from Map.blend: 6m invisible walls along the edge of walkable ground,
// preventing climbing mountains or falling off the summit. Keeps swamp wells and tunnel entrances clear.
export function LimitesJuego() {
  const { scene } = useGLTF(LIMITE_URL);
  return (
    <RigidBody type="fixed" colliders="trimesh" includeInvisible userData={LIMITE_USER_DATA}>
      <primitive object={scene} visible={false} />
    </RigidBody>
  );
}

useGLTF.preload(LIMITE_URL);
