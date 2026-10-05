import { ImeriExterior } from './ImeriExterior';
import { ImeriInterior } from './ImeriInterior';
import { Gema } from './recogibles/Gema';
import { PocionAmbar } from './recogibles/PocionAmbar';
import { PocionHojas } from './recogibles/PocionHojas';
import { PocionHongos } from './recogibles/PocionHongos';
import { PocionPequena } from './recogibles/PocionPequena';
import { PocionRoja } from './recogibles/PocionRoja';
import { Soga } from './recogibles/Soga';

export function CasaImeri(props: any) {
  return (
    <group name="CasaImeri" {...props}>
      <ImeriExterior />
      <ImeriInterior />
      <Gema />
      <PocionAmbar />
      <PocionHojas />
      <PocionHongos />
      <PocionPequena />
      <PocionRoja />
      <Soga />
    </group>
  );
}
