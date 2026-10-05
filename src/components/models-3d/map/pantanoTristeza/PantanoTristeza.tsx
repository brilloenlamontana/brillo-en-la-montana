import { PantanoPozos } from './PantanoPozos';
import { PantanoTapas } from './PantanoTapas';

export function PantanoTristeza(props: any) {
  return (
    <group name="PantanoTristeza" {...props}>
      <PantanoPozos />
      <PantanoTapas />
    </group>
  );
}
