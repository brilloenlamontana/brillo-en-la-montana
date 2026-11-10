import { useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { applyMaterialLook, type MaterialLook } from '@/game/engine/models/materialLook';
import { StaticModel } from '@/game/engine/models/StaticModel';
import { useMundoRecuperado } from '@/game/world/recuperado';
import { useVisibleFrom } from '@/game/world/visibility';
import { RELATO_CIERRE_MODELS } from '../assets';
import { VISIBLE_FROM } from '../visibility';

const { camino, columnas, nieve, edificios, jardines, follaje } = RELATO_CIERRE_MODELS.cumbreDesolacion;
const montanas = RELATO_CIERRE_MODELS.montanas;
// Module constants: a new array per render would rebuild the trimesh colliders every time.
const COLUMNAS_COLLIDERS = ['CumbreColumnata'] as const;
const EDIFICIOS_COLLIDERS = ['CumbreRuinas'] as const;
const JARDINES_COLLIDERS = ['CumbreMurosJardin'] as const;

// The summit once the chalice is back and the cold gives way: the snow is meadow, the frost on the frozen trees is new
// leaf, the icicles are gone and rock and bark warm up. Flat-colour materials shared by the summit GLBs.
const CUMBRE_RECUPERADA: MaterialLook = {
  CumbreNieveMaterial: '#6fa84a',
  CumbreEscarchaMaterial: '#8cc458',
  HieloCarambanoMaterial: null,
  CumbreRocaMontanaMaterial: '#6f6a58',
  CumbreCortezaMaterial: '#5c3f26',
  CumbreMaderaMuertaMaterial: '#4d341f',
};
const RECOVERED_URLS = [montanas, camino, nieve, jardines, RELATO_CIERRE_MODELS.santuario.exterior];

// Repaints one summit GLB. Asked for by its own URL: that is the copy the world draws (an array of URLs is another one).
function LookRecuperado({ url, on }: { url: string; on: boolean }) {
  const { scene } = useGLTF(url);
  useLayoutEffect(() => applyMaterialLook(scene, CUMBRE_RECUPERADA, on), [scene, on]);
  return null;
}

// "CumbreDesolacion" collection of Map.blend: the ruined town on the summit (ancient avenue, plaza, broken columns
// and arches, frozen gardens and snow piles), framed by the snowy slopes of CumbreMontanas.
export function CumbreDesolacion() {
  const visible = useVisibleFrom(VISIBLE_FROM.cumbre);
  const recuperado = useMundoRecuperado();
  return (
    <group name="CumbreDesolacion">
      {RECOVERED_URLS.map((url) => (
        <LookRecuperado key={url} url={url} on={recuperado} />
      ))}
      <StaticModel url={montanas} visible={visible} />
      <StaticModel url={camino} visible={visible} />
      <StaticModel url={columnas} visible={visible} colliders={COLUMNAS_COLLIDERS} />
      <StaticModel url={nieve} visible={visible} />
      <StaticModel url={edificios} visible={visible} colliders={EDIFICIOS_COLLIDERS} merge />
      <StaticModel url={jardines} visible={visible} colliders={JARDINES_COLLIDERS} merge />
      {/* The frozen trees are in leaf again once the world recovers. */}
      <StaticModel url={follaje} visible={visible && recuperado} merge />
    </group>
  );
}

useGLTF.preload([montanas, camino, columnas, nieve, edificios, jardines]);
// On its own: it is drawn late, and a model that is not ready then would suspend the whole world.
useGLTF.preload(follaje);
