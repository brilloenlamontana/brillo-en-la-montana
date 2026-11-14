import { MudTracker } from './MudTracker';
import { PantanoPozos } from './PantanoPozos';
import { PantanoTapas } from './PantanoTapas';
import { PantanoVegetacion } from './PantanoVegetacion';
import { WellTrap } from './WellTrap';

// "PantanoTristeza" collection of Map.blend: the wells (traps) and their lids, what grows in the mud, plus the
// swamp's live rules.
export function PantanoTristeza() {
  return (
    <group name="PantanoTristeza">
      <PantanoPozos />
      <PantanoTapas />
      <PantanoVegetacion />
      <MudTracker />
      <WellTrap />
    </group>
  );
}
