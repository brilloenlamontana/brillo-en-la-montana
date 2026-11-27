import { useGLTF } from '@react-three/drei';
import { InstancedField } from '@/game/engine/models/InstancedField';
import { MAPA_MODELS } from '@/game/world/assets';

const URL = MAPA_MODELS.rocas;
// Drawn up to this distance outdoors; indoors almost none.
const MAX_DISTANCE = 130;

// Rocks across the whole map, drawn instanced (only those in view). Purely decorative: no collision.
export function Rocas() {
  return <InstancedField url={URL} maxDistance={MAX_DISTANCE} />;
}

useGLTF.preload(URL);
