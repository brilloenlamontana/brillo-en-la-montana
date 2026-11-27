import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { InstancedField } from '@/game/engine/models/InstancedField';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { boundingBoxCore, trunkColliders } from '@/game/engine/physics/trunkColliders';
import { MAPA_MODELS } from '@/game/world/assets';

const URL = MAPA_MODELS.pinares;
// Drawn up to the fog, the same from anywhere (indoors too: nothing comes and goes on crossing a door).
const MAX_DISTANCE = 170;

// Pines across the whole map, drawn instanced (only those in view). One cuboid per pine is their collision: its
// trunk alone (the boughs do not stop the avatar).
export function Pinares() {
  const { scene } = useGLTF(URL);
  const trunks = useMemo(() => trunkColliders(scene, 'PinoCorteza', boundingBoxCore), [scene]);

  return (
    <>
      <InstancedField url={URL} maxDistance={MAX_DISTANCE} />
      <CuboidColliders boxes={trunks} />
    </>
  );
}

useGLTF.preload(URL);
