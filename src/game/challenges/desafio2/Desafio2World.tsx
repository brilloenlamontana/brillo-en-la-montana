import { BosqueOscuridad } from './bosqueOscuridad/BosqueOscuridad';
import { CasaDelElfo } from './casaDelElfo/CasaDelElfo';
import { BosqueDuendes } from './duendes/BosqueDuendes';
import { HambreDelBosque } from './frutos/HambreDelBosque';
import { Elfo } from './npcs/Elfo';

// Challenge 2 in the 3D world: the Dark Forest with its goblins, fruit and hunger, and the elf's house in the valley
// at its entrance.
export function Desafio2World() {
  return (
    <group name="Desafio2">
      <BosqueOscuridad />
      <CasaDelElfo />
      <Elfo />
      <BosqueDuendes />
      <HambreDelBosque />
    </group>
  );
}
