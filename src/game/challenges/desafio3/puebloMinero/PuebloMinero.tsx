import { useGLTF } from '@react-three/drei';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { CuboidColliders } from '@/game/engine/physics/CuboidColliders';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO3_MODELS } from '../assets';
import { VISIBLE_FROM } from '../visibility';
import { PUEBLO_COLLIDERS } from './puebloColliders';

const URL = DESAFIO3_MODELS.puebloMinero;

// "PuebloMinero" collection of Map.blend: what is left of the mining town next to Hedrig's house (collapsed hut,
// tombstones, caved-in mine entrances and a minecart). One fitted box per object collides (puebloColliders.ts).
export function PuebloMinero() {
  const visible = useVisibleFrom(VISIBLE_FROM.puebloHedrig);
  return (
    <>
      <StaticModel url={URL} visible={visible} />
      <CuboidColliders boxes={PUEBLO_COLLIDERS} />
    </>
  );
}

useGLTF.preload(URL);
