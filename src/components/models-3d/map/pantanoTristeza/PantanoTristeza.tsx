import { PantanoPozos } from './PantanoPozos';
import { PantanoTapas } from './PantanoTapas';

export function PantanoTristeza() {
  return (
    <group name="PantanoTristeza">
      <PantanoPozos />
      <PantanoTapas />
    </group>
  );
}
