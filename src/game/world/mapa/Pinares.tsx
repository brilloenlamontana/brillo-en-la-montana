import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { InstancedField } from '@/game/engine/models/InstancedField';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { boundingBoxCore, trunkColliders } from '@/game/engine/physics/trunkColliders';
import { useInterior } from '@/game/world/visibility';
import { MAPA_MODELS } from '@/game/world/assets';

const URL = MAPA_MODELS.pinares;
// Drawn up to the fog outdoors; indoors only what shows through the windows.
const MAX_DISTANCE = { outdoors: 170, indoors: 60 };

// Pines across the whole map, drawn instanced (only those in view). One cuboid per trunk is their collision.
export function Pinares() {
  const indoors = useInterior() !== null;
  const { scene } = useGLTF(URL);
  const trunks = useMemo(() => trunkColliders(scene, 'PinoCorteza', boundingBoxCore), [scene]);

  return (
    <>
      <InstancedField url={URL} maxDistance={indoors ? MAX_DISTANCE.indoors : MAX_DISTANCE.outdoors} />
      <CuboidColliders boxes={trunks} />
    </>
  );
}

useGLTF.preload(URL);
