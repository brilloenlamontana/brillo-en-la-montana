import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { Vector3, type BufferGeometry } from 'three';
import { InstancedField } from '@/game/engine/models/InstancedField';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { trunkColliders, type TrunkCore } from '@/game/engine/physics/trunkColliders';
import { useInterior, useRegion } from '@/game/world/visibility';
import { DESAFIO2_MODELS } from '../assets';
import { FrutosBosque } from '../frutos/FrutosBosque';
import { BOSQUE_MAX_DISTANCE, BOSQUE_MAX_DISTANCE_INDOORS } from '../visibility';

const { arboles: ARBOLES_URL, hongos: HONGOS_URL } = DESAFIO2_MODELS.bosqueOscuridad;
// The roots of these trees start ~1 m under the ground and spread wide, so the trunk is measured between these heights
// above the lowest point of each model, where there are neither roots nor branches. The box then goes from that
// lowest point up to TRUNK_HEIGHT.
const MEASURE_FROM = 2.5;
const MEASURE_TO = 4;
const TRUNK_HEIGHT = 5;

// Trunk from the bark vertices of the measured band: centered on them, with their median radius.
function measuredTrunk(geometry: BufferGeometry): TrunkCore {
  const position = geometry.attributes.position;
  let minY = Infinity;
  for (let i = 0; i < position.count; i++) minY = Math.min(minY, position.getY(i));
  const ring: [number, number][] = [];
  for (let i = 0; i < position.count; i++) {
    const y = position.getY(i) - minY;
    if (y > MEASURE_FROM && y < MEASURE_TO) ring.push([position.getX(i), position.getZ(i)]);
  }
  const cx = ring.reduce((sum, [x]) => sum + x, 0) / ring.length;
  const cz = ring.reduce((sum, [, z]) => sum + z, 0) / ring.length;
  const distances = ring.map(([x, z]) => Math.hypot(x - cx, z - cz)).sort((a, b) => a - b);
  const radius = distances[Math.floor(distances.length / 2)] * 0.9;
  return { center: new Vector3(cx, minY + TRUNK_HEIGHT / 2, cz), half: new Vector3(radius, TRUNK_HEIGHT / 2, radius) };
}

// "BosqueOscuridad" collection of Map.blend: trees, mushrooms and the edible fruit (see frutos/). The trunks are its
// only colliders. Far from the forest nothing is drawn; from the swamp and the valley only the trees.
export function BosqueOscuridad() {
  const { scene: arbolesScene } = useGLTF(ARBOLES_URL);
  const trunks = useMemo(() => trunkColliders(arbolesScene, 'BosqueCorteza', measuredTrunk), [arbolesScene]);
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
    </group>
  );
}

useGLTF.preload([ARBOLES_URL, HONGOS_URL]);
