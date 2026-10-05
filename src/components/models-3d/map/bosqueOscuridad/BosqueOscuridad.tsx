import { BosqueArboles } from './BosqueArboles';
import { BosqueHongos } from './BosqueHongos';
import { BosqueManzanas } from './BosqueManzanas';

export function BosqueOscuridad(props: any) {
  return (
    <group name="BosqueOscuridad" {...props}>
      <BosqueArboles />
      <BosqueHongos />
      <BosqueManzanas />
    </group>
  );
}
