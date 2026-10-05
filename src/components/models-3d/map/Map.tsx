import { useZoneStore } from '../../../store/zoneStore';
import { BosqueOscuridad } from './bosqueOscuridad/BosqueOscuridad';
import { CasaImeri } from './casaImeri/CasaImeri';
import { PantanoTristeza } from './pantanoTristeza/PantanoTristeza';
import { Pinares } from './pinares/Pinares';
import { Rocas } from './rocas/Rocas';
import { Terreno } from './terreno/Terreno';
import { VillaBoj } from './villaBoj/VillaBoj';

export function Map(props: any) {
  const insideVillaBoj = useZoneStore((state) => state.insideVillaBoj);

  return (
    <group {...props}>
      <Terreno />
      <Pinares />
      <VillaBoj />
      {/* Ocultar con visible conserva los colliders y evita volver a subir las mallas a la GPU al salir de la villa. */}
      <group visible={!insideVillaBoj}>
        <CasaImeri />
        <BosqueOscuridad />
        <PantanoTristeza />
        <Rocas />
      </group>
    </group>
  );
}
