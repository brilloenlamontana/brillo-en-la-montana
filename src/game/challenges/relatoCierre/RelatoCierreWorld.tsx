import { CinematicaFinal } from './cinematica/CinematicaFinal';
import { CumbreDesolacion } from './cumbreDesolacion/CumbreDesolacion';
import { Santuario } from './santuario/Santuario';

// Closing story in the 3D world: the top of the Summit of Desolation, reached through the Challenge 3 tunnels, and the
// camera of the final cinematic that plays once the chalice is taken.
export function RelatoCierreWorld() {
  return (
    <group name="RelatoCierre">
      <CumbreDesolacion />
      <Santuario />
      <CinematicaFinal />
    </group>
  );
}
