import { useGLTF } from '@react-three/drei';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO1_MODELS } from '../assets';
import { VISIBLE_FROM } from '../visibility';
import { Porton } from './Porton';
import { VILLA_COLLIDER_BOXES } from './villaColliders';

const { empalizada, villa } = DESAFIO1_MODELS.villaDeBoj;

// "VillaDeBoj" collection of Map.blend: palisade, gate and buildings. From the swamp on it is hidden behind the
// mountains, so it is not drawn (its colliders stay).
export function VillaDeBoj() {
  const visible = useVisibleFrom(VISIBLE_FROM.villaBoj);
  return (
    <group name="VillaDeBoj">
      <group visible={visible}>
        <StaticModel url={empalizada} />
        <StaticModel url={villa} />
        <Porton />
      </group>
      <CuboidColliders boxes={VILLA_COLLIDER_BOXES} />
    </group>
  );
}

useGLTF.preload([empalizada, villa]);
