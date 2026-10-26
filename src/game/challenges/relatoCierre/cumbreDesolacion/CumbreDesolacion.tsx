import { useGLTF } from '@react-three/drei';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { useVisibleFrom } from '@/game/world/visibility';
import { RELATO_CIERRE_MODELS } from '../assets';
import { VISIBLE_FROM } from '../visibility';

const { camino, columnas, nieve, edificios, jardines } = RELATO_CIERRE_MODELS.cumbreDesolacion;
// Module constants: a new array per render would rebuild the trimesh colliders every time.
const COLUMNAS_COLLIDERS = ['CumbreColumnata'] as const;
const EDIFICIOS_COLLIDERS = ['CumbreRuinas'] as const;
const JARDINES_COLLIDERS = ['CumbreMurosJardin'] as const;

// "CumbreDesolacion" collection of Map.blend: the ruined town on the summit (ancient avenue, plaza, broken columns
// and arches, frozen gardens and snow piles).
export function CumbreDesolacion() {
  const visible = useVisibleFrom(VISIBLE_FROM.cumbre);
  return (
    <group name="CumbreDesolacion">
      <StaticModel url={camino} visible={visible} />
      <StaticModel url={columnas} visible={visible} colliders={COLUMNAS_COLLIDERS} />
      <StaticModel url={nieve} visible={visible} />
      <StaticModel url={edificios} visible={visible} colliders={EDIFICIOS_COLLIDERS} merge />
      <StaticModel url={jardines} visible={visible} colliders={JARDINES_COLLIDERS} merge />
    </group>
  );
}

useGLTF.preload([camino, columnas, nieve, edificios, jardines]);
