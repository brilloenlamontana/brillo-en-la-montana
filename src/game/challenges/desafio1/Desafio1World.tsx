import { CartaAlcalde } from './cartaAlcalde/CartaAlcalde';
import { ChozaEstatua } from './chozaEstatua/ChozaEstatua';
import { CasaDeImeri } from './casaDeImeri/CasaDeImeri';
import { PantanoEnemies } from './enemies/PantanoEnemies';
import { Aldeana } from './npcs/Aldeana';
import { Aldeano } from './npcs/Aldeano';
import { Imeri } from './npcs/Imeri';
import { PantanoTristeza } from './pantanoTristeza/PantanoTristeza';
import { VillaDeBoj } from './villaDeBoj/VillaDeBoj';

// Challenge 1 in the 3D world: Villa Boj with the mayor's letter and the villager, Imeri's house, and the Swamp of
// Sadness with its wells, the golem and the zumbadores, and the ruined hut of the statue (Bonus 1).
export function Desafio1World() {
  return (
    <group name="Desafio1">
      <VillaDeBoj />
      <CartaAlcalde />
      <Aldeano />
      <Aldeana />
      <CasaDeImeri />
      <Imeri />
      <PantanoTristeza />
      <PantanoEnemies />
      <ChozaEstatua />
    </group>
  );
}
