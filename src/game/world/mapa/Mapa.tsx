import { LimitesJuego } from './LimitesJuego';
import { Pinares } from './Pinares';
import { Rocas } from './Rocas';
import { Terreno } from './Terreno';

// "Mapa" collection of Map.blend: what every challenge shares (terrain, invisible limits, pines and rocks).
export function Mapa() {
  return (
    <group name="Mapa">
      <Terreno />
      <LimitesJuego />
      <Pinares />
      <Rocas />
    </group>
  );
}
