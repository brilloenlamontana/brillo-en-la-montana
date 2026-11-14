import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { InstancedField } from '@/game/engine/models/InstancedField';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { foliageBox, trunkColliders } from '@/game/engine/physics/trunkColliders';
import { useInterior } from '@/game/world/visibility';
import { MAPA_MODELS } from '@/game/world/assets';

const URL = MAPA_MODELS.pinares;
// Drawn up to the fog outdoors; indoors only what shows through the windows.
const MAX_DISTANCE = { outdoors: 170, indoors: 60 };

// Pines across the whole map, drawn instanced (only those in view). One cuboid per pine is their collision: as wide
// as its lowest boughs and from the ground to its tip, so the avatar does not walk through the leaves.
export function Pinares() {
  const indoors = useInterior() !== null;
  const { scene } = useGLTF(URL);
  const trunks = useMemo(() => trunkColliders(scene, 'PinoFollaje', (geometry) => foliageBox(geometry)), [scene]);

  return (
    <>
      <InstancedField url={URL} maxDistance={indoors ? MAX_DISTANCE.indoors : MAX_DISTANCE.outdoors} />
      <CuboidColliders boxes={trunks} />
    </>
  );
}

useGLTF.preload(URL);
