import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { BufferGeometry } from 'three';
import { InstancedField } from '@/game/engine/models/InstancedField';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { lowBarkBoxes, trunkColliders } from '@/game/engine/physics/trunkColliders';
import { useInterior, useRegion } from '@/game/world/visibility';
import { DESAFIO2_MODELS } from '../assets';
import { FrutosBosque } from '../frutos/FrutosBosque';
import { BOSQUE_MAX_DISTANCE, BOSQUE_MAX_DISTANCE_INDOORS } from '../visibility';
import { BosqueMuroOculto } from './BosqueMuroOculto';
import { setBosqueObstaculos } from './obstaculos';

const { arboles: ARBOLES_URL, hongos: HONGOS_URL } = DESAFIO2_MODELS.bosqueOscuridad;
// These trees lean, flare at the foot and spread their roots wide (they start ~1 m under the ground): what the avatar
// bumps into is their bark from the ground up to the height of a head, as a handful of boxes per tree (lowBarkBoxes).
// Thin roots lying on the earth are stepped over and the branches are over every head.
const barkBoxes = (geometry: BufferGeometry) => lowBarkBoxes(geometry);

// "BosqueOscuridad" collection of Map.blend: trees, mushrooms and the edible fruit (see frutos/). The trunks and thick
// roots are its only colliders; the goblins, who walk by code, go around the same boxes (obstaculos.ts). Far from the forest nothing is drawn; from the swamp and the valley only the trees.
export function BosqueOscuridad() {
  const { scene: arbolesScene } = useGLTF(ARBOLES_URL);
  const trunks = useMemo(() => trunkColliders(arbolesScene, 'BosqueCorteza', barkBoxes), [arbolesScene]);
  useEffect(() => setBosqueObstaculos(trunks), [trunks]);
  const region = useRegion();
  const interior = useInterior();
  const distance = (part: keyof typeof BOSQUE_MAX_DISTANCE) =>
    interior ? BOSQUE_MAX_DISTANCE_INDOORS[part][interior] : BOSQUE_MAX_DISTANCE[part][region];
  const arboles = distance('arboles');
  const hongos = distance('hongos');
  const manzanas = distance('manzanas');

  return (
    <group name="BosqueOscuridad">
      <InstancedField url={ARBOLES_URL} maxDistance={arboles ?? 0} enabled={arboles !== undefined} />
      <InstancedField url={HONGOS_URL} maxDistance={hongos ?? 0} enabled={hongos !== undefined} />
      <FrutosBosque maxDistance={manzanas ?? 0} enabled={manzanas !== undefined} />
      <CuboidColliders boxes={trunks} />
      <BosqueMuroOculto />
    </group>
  );
}

useGLTF.preload([ARBOLES_URL, HONGOS_URL]);
