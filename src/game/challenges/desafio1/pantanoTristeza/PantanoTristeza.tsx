import { MudTracker } from './MudTracker';
import { PantanoPozos } from './PantanoPozos';
import { PantanoTapas } from './PantanoTapas';
import { WellTrap } from './WellTrap';

// "PantanoTristeza" collection of Map.blend: the wells (traps) and their lids, plus the swamp's live rules.
export function PantanoTristeza() {
  return (
    <group name="PantanoTristeza">
      <PantanoPozos />
      <PantanoTapas />
      <MudTracker />
      <WellTrap />
    </group>
  );
}
