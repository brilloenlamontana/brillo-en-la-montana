import { LimitesJuego } from './LimitesJuego';
import { Pasto } from './Pasto';
import { Pinares } from './Pinares';
import { Rocas } from './Rocas';
import { Terreno } from './Terreno';

// "Mapa" collection of Map.blend: what every challenge shares (terrain, invisible limits, pines, rocks and the
// grass that grows over the open ground).
export function Mapa() {
  return (
    <group name="Mapa">
      <Terreno />
      <LimitesJuego />
      <Pinares />
      <Rocas />
      <Pasto />
    </group>
  );
}
