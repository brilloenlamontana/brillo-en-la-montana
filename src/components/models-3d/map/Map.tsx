
import { BosqueOscuridad } from './bosqueOscuridad/BosqueOscuridad';
import { CasaImeri } from './casaImeri/CasaImeri';
import { PantanoTristeza } from './pantanoTristeza/PantanoTristeza';
import { Pinares } from './pinares/Pinares';
import { Rocas } from './rocas/Rocas';
import { Terreno } from './terreno/Terreno';
import { VillaBoj } from './villaBoj/VillaBoj';

export function Map(props: any) {
  return (
    <group {...props}>

      <BosqueOscuridad />
      <CasaImeri />
      <PantanoTristeza />
      <Pinares />
      <Rocas />
      <Terreno />
      <VillaBoj />
    </group>
  );
}
