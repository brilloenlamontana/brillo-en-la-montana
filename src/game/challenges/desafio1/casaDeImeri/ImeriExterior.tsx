import { useGLTF } from '@react-three/drei';
import { PhysicsDoor } from '@/game/engine/physics/PhysicsDoor';
import { DESAFIO1_MODELS } from '../assets';
import { DOOR_CLOSE_ROTATION, DOOR_HINGE_WORLD, DOOR_NODE_NAME } from './houseFrame';

const IMERI_EXTERIOR_URL = DESAFIO1_MODELS.casaDeImeri.exterior;

// Exterior of Imeri's house. The door has physics: the player opens it by pushing, but only
// once the house is unlocked.
export function ImeriExterior({ locked, visible }: { locked: boolean; visible: boolean }) {
  const { scene, nodes } = useGLTF(IMERI_EXTERIOR_URL);
  const doorNode = nodes[DOOR_NODE_NAME];

  return (
    <>
      <primitive object={scene} visible={visible} />
      {doorNode && (
        // The GLB exports the door open inwards: when closed it is rotated by DOOR_CLOSE_ROTATION on its hinge.
        <PhysicsDoor
          node={doorNode}
          target={doorNode}
          hinge={DOOR_HINGE_WORLD}
          closedTurn={DOOR_CLOSE_ROTATION}
          locked={locked}
        />
      )}
    </>
  );
}

useGLTF.preload(IMERI_EXTERIOR_URL);
