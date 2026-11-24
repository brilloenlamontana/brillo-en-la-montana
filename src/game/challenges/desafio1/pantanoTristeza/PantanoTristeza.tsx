import { MudTracker } from './MudTracker';
import { PantanoPozos } from './PantanoPozos';
import { PantanoVegetacion } from './PantanoVegetacion';
import { WellTrap } from './WellTrap';

// "PantanoTristeza" collection of Map.blend: the wells (traps, hidden under the ground), what grows in the mud, plus
// the swamp's live rules.
export function PantanoTristeza() {
  return (
    <group name="PantanoTristeza">
      <PantanoPozos />
      <PantanoVegetacion />
      <MudTracker />
      <WellTrap />
    </group>
  );
}
