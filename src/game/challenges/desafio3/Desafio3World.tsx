import { BrujulaGuia } from './brujula/BrujulaGuia';
import { CasaDeHedrig } from './casaDeHedrig/CasaDeHedrig';
import { Espectro } from './espectro/Espectro';
import { LlegadaALaCumbre } from './LlegadaALaCumbre';
import { LlegadaAlPueblo } from './LlegadaAlPueblo';
import { Hedrig } from './npcs/Hedrig';
import { Ogro } from './ogro/Ogro';
import { PuebloMinero } from './puebloMinero/PuebloMinero';
import { TunelesCumbre } from './tunelesCumbre/TunelesCumbre';

// Challenge 3 in the 3D world: Hedrig and her house in the mining town (whose arrival starts it), and the maze of the
// Summit tunnels with the compass trail, the girl's spectre and the Ogre who guards the stairs to the summit.
export function Desafio3World() {
  return (
    <group name="Desafio3">
      <TunelesCumbre />
      <CasaDeHedrig />
      <Hedrig />
      <PuebloMinero />
      <BrujulaGuia />
      <Espectro />
      <Ogro />
      <LlegadaAlPueblo />
      <LlegadaALaCumbre />
    </group>
  );
}
