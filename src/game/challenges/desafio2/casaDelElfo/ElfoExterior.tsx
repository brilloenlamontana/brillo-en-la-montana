import { useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { freeze } from '@/game/engine/models/sceneUtils';
import { PhysicsDoor } from '@/game/engine/physics/PhysicsDoor';
import { DESAFIO2_MODELS } from '../assets';

const EXTERIOR_URL = DESAFIO2_MODELS.casaDelElfo.exterior;
// The door leaf is modeled closed, with its origin on the hinge.
const DOOR_NODE = 'ElfoPuerta';

// Outside of the elf's house. Its door fills the gap the wall cuboids leave (elfoColliders.ts): locked until the elf's
// help is accepted, then the player pushes it open.
export function ElfoExterior({ locked, visible }: { locked: boolean; visible: boolean }) {
  const { scene, nodes } = useGLTF(EXTERIOR_URL);
  useLayoutEffect(() => freeze(scene), [scene]);
  const door = nodes[DOOR_NODE];

  return (
    <>
      <primitive object={scene} visible={visible} />
      {door && <PhysicsDoor node={door} locked={locked} />}
    </>
  );
}

useGLTF.preload(EXTERIOR_URL);
