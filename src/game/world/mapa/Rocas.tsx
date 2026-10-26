import { useGLTF } from '@react-three/drei';
import { InstancedField } from '@/game/engine/models/InstancedField';
import { useInterior } from '@/game/world/visibility';
import { MAPA_MODELS } from '@/game/world/assets';

const URL = MAPA_MODELS.rocas;
// Drawn up to this distance outdoors; indoors almost none.
const MAX_DISTANCE = { outdoors: 130, indoors: 40 };

// Rocks across the whole map, drawn instanced (only those in view). Purely decorative: no collision.
export function Rocas() {
  const indoors = useInterior() !== null;
  return <InstancedField url={URL} maxDistance={indoors ? MAX_DISTANCE.indoors : MAX_DISTANCE.outdoors} />;
}

useGLTF.preload(URL);
