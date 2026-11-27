import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { BufferGeometry } from 'three';
import { InstancedField } from '@/game/engine/models/InstancedField';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { trunkBox, trunkColliders } from '@/game/engine/physics/trunkColliders';
import { DESAFIO2_MODELS } from '../assets';
import { FrutosBosque } from '../frutos/FrutosBosque';
import { BOSQUE_REACH } from '../visibility';
import { BosqueMuroOculto } from './BosqueMuroOculto';
import { setBosqueObstaculos } from './obstaculos';

const { arboles: ARBOLES_URL, hongos: HONGOS_URL } = DESAFIO2_MODELS.bosqueOscuridad;
// These trees lean, flare at the foot and spread their roots wide: only the trunk stops the avatar, as one box per
// tree (trunkBox). Roots are walked over and branches walked through.
const barkBoxes = (geometry: BufferGeometry) => trunkBox(geometry);

// "BosqueOscuridad" collection of Map.blend: trees, mushrooms and the edible fruit (see frutos/). The trunks
// are its only colliders; the goblins, who walk by code, go around the same boxes (obstaculos.ts). Trees, mushrooms and fruit are drawn within their own distance of the camera, wherever the player is.
export function BosqueOscuridad() {
  const { scene: arbolesScene } = useGLTF(ARBOLES_URL);
  const trunks = useMemo(() => trunkColliders(arbolesScene, 'BosqueCorteza', barkBoxes), [arbolesScene]);
  useEffect(() => setBosqueObstaculos(trunks), [trunks]);
  // The same reach from everywhere (it used to change with the region, and trees were seen coming and going): each
  // field only draws what is within its distance of the camera.
  const { arboles, hongos, manzanas } = BOSQUE_REACH;

  return (
    <group name="BosqueOscuridad">
      <InstancedField url={ARBOLES_URL} maxDistance={arboles} />
      <InstancedField url={HONGOS_URL} maxDistance={hongos} />
      <FrutosBosque maxDistance={manzanas} enabled />
      <CuboidColliders boxes={trunks} />
      <BosqueMuroOculto />
    </group>
  );
}

