import { useGLTF } from '@react-three/drei';
import { InstancedField } from '@/game/engine/models/InstancedField';
import { useVisibleFrom } from '@/game/world/visibility';
import { DESAFIO1_MODELS } from '../assets';
import { VISIBLE_FROM } from '../visibility';

const URL = DESAFIO1_MODELS.pantanoTristeza.vegetacion;
// Thin plants: past this distance (m) they would be a few pixels.
const MAX_DISTANCE = 75;

// What grows in the mud of the Swamp of Sadness ("PantanoVegetacion" collection of Map.blend): clumps of reeds and
// cattails and dry branches sticking out of the mud, in groups along its shores and here and there inside it, never
// by a well. Drawn instanced (only those in view); the reeds sway with the wind (rendering/vegetation.ts). They have
// no collision: the avatar wades through them.
export function PantanoVegetacion() {
  const visible = useVisibleFrom(VISIBLE_FROM.vegetacion);
  return <InstancedField url={URL} maxDistance={MAX_DISTANCE} enabled={visible} />;
}

useGLTF.preload(URL);
