import { BosqueOscuridad } from './bosqueOscuridad/BosqueOscuridad';
import { CasaImeri } from './casaImeri/CasaImeri';
import { PantanoTristeza } from './pantanoTristeza/PantanoTristeza';
import { Pinares } from './pinares/Pinares';
import { Rocas } from './rocas/Rocas';
import { Terreno } from './terreno/Terreno';
import { VillaBoj } from './villaBoj/VillaBoj';

// Cada parte decide qué dibujar según la región del jugador (constants/regionVisibility.ts) y su distancia a la cámara.
// Ocultar con `visible` conserva los colliders y evita volver a subir las mallas a la GPU al regresar.
export function Map() {
  return (
    <group name="mapa">
      <Terreno />
      <Pinares />
      <Rocas />
      <VillaBoj />
      <CasaImeri />
      <PantanoTristeza />
      <BosqueOscuridad />
    </group>
  );
}
