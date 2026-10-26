import { CumbreDesolacion } from './cumbreDesolacion/CumbreDesolacion';
import { Santuario } from './santuario/Santuario';

// Closing story in the 3D world: the top of the Summit of Desolation, reached through the Challenge 3 tunnels.
export function RelatoCierreWorld() {
  return (
    <group name="RelatoCierre">
      <CumbreDesolacion />
      <Santuario />
    </group>
  );
}
