import { useGLTF } from '@react-three/drei';
import { BOSQUE_MAX_DISTANCE } from '../../../../constants/regionVisibility';
import { useRegion } from '../../../../hooks/useRegion';
import { InstancedField } from '../InstancedField';

const DIR = '/models-3d/map/BosqueOscuridad/';
// Niveles de detalle generados con `npm run lods`.
const ARBOLES_URLS = [`${DIR}BosqueArboles.glb`, `${DIR}BosqueArboles_LOD1.glb`, `${DIR}BosqueArboles_LOD2.glb`];
const ARBOLES_DISTANCES = [0, 100, 150];
const HONGOS_URLS = [`${DIR}BosqueHongos.glb`, `${DIR}BosqueHongos_LOD1.glb`, `${DIR}BosqueHongos_LOD2.glb`];
const HONGOS_DISTANCES = [0, 50, 100];
const MANZANAS_URLS = [`${DIR}BosqueManzanas.glb`];
const MANZANAS_DISTANCES = [0];

// Fuera del bosque, el pantano y la colina no se dibuja nada. Desde el pantano solo aparecen los primeros árboles de la
// entrada; el resto, los hongos y las manzanas aparecen a medida que el jugador se acerca (ver BOSQUE_MAX_DISTANCE).
export function BosqueOscuridad() {
  const region = useRegion();
  const arboles = BOSQUE_MAX_DISTANCE.arboles[region];
  const hongos = BOSQUE_MAX_DISTANCE.hongos[region];
  const manzanas = BOSQUE_MAX_DISTANCE.manzanas[region];

  return (
    <group name="BosqueOscuridad">
      <InstancedField urls={ARBOLES_URLS} distances={ARBOLES_DISTANCES} maxDistance={arboles ?? 0} enabled={arboles !== undefined} />
      <InstancedField urls={HONGOS_URLS} distances={HONGOS_DISTANCES} maxDistance={hongos ?? 0} enabled={hongos !== undefined} />
      <InstancedField urls={MANZANAS_URLS} distances={MANZANAS_DISTANCES} maxDistance={manzanas ?? 0} enabled={manzanas !== undefined} />
    </group>
  );
}

useGLTF.preload([...ARBOLES_URLS, ...HONGOS_URLS, ...MANZANAS_URLS]);
