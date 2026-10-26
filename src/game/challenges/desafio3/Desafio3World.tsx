import { CasaDeHedrig } from './casaDeHedrig/CasaDeHedrig';
import { LlegadaAlPueblo } from './LlegadaAlPueblo';
import { PuebloMinero } from './puebloMinero/PuebloMinero';
import { TunelesCumbre } from './tunelesCumbre/TunelesCumbre';

// Challenge 3 in the 3D world: the Summit tunnels, Hedrig's house and the mining town, whose arrival starts it.
export function Desafio3World() {
  return (
    <group name="Desafio3">
      <TunelesCumbre />
      <CasaDeHedrig />
      <PuebloMinero />
      <LlegadaAlPueblo />
    </group>
  );
}
