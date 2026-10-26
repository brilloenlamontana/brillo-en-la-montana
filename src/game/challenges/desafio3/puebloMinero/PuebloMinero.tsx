import { useGLTF } from '@react-three/drei';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO3_MODELS } from '../assets';
import { VISIBLE_FROM } from '../visibility';

const URL = DESAFIO3_MODELS.puebloMinero;
const COLLIDERS = ['PuebloChozaDerrumbada', 'PuebloLapidas', 'PuebloTunelesColapsados', 'PuebloVagoneta'] as const;

// "PuebloMinero" collection of Map.blend: what is left of the mining town next to Hedrig's house (collapsed hut,
// tombstones, caved-in mine entrances and a minecart).
export function PuebloMinero() {
  const visible = useVisibleFrom(VISIBLE_FROM.puebloHedrig);
  return <StaticModel url={URL} visible={visible} colliders={COLLIDERS} />;
}

useGLTF.preload(URL);
